use std::collections::VecDeque;
use std::mem::drop;
use std::ops::{Deref, DerefMut, Drop};
use std::sync::{Arc, Weak};

use async_trait::async_trait;
use futures::channel::{mpsc, oneshot};
use futures::lock::Mutex;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum PoolError {
    #[error("timeout")]
    Timeout,
    #[error("canceled")]
    Canceled,
}

pub struct Connect<F: Factory> {
    connect: Option<F::Output>,
    pool: Weak<SharedPool<F>>,
}

impl<F: Factory> Connect<F> {
    pub fn new(conn: F::Output) -> Connect<F> {
        Connect {
            connect: Some(conn),
            pool: Weak::new(),
        }
    }
}

impl<F: Factory> Deref for Connect<F> {
    type Target = F::Output;

    fn deref(&self) -> &F::Output {
        self.connect.as_ref().unwrap()
    }
}

impl<F: Factory> DerefMut for Connect<F> {
    fn deref_mut(&mut self) -> &mut F::Output {
        self.connect.as_mut().unwrap()
    }
}

impl<F: Factory> Drop for Connect<F> {
    fn drop(&mut self) {
        if let Some(pool) = self.pool.upgrade() {
            let mut tx = pool.connect_sender.clone();
            if let Err(e) = tx.try_send(self.connect.take()) {
                log::error!("Unable to send the connection to `recycle`: {}", e);
            }
        }
    }
}

struct InternalPool<C> {
    waiters: VecDeque<oneshot::Sender<C>>,
    conns: VecDeque<Option<C>>,
    num: usize,
}

impl<C> InternalPool<C> {
    fn put_back(&mut self, mut connection: Option<C>) {
        if connection.is_none() {
            self.conns.push_back(None);
            return;
        }
        while let Some(waiter) = self.waiters.pop_front() {
            if let Some(conn) = connection {
                // The rx was dropped
                if let Err(returned) = waiter.send(conn) {
                    // Send the connection to the next waiter
                    connection = Some(returned);
                } else {
                    return;
                }
            }
        }
        self.conns.push_back(connection);
    }
}

pub struct SharedPool<F: Factory> {
    factory: F,
    inner: Mutex<InternalPool<F::Output>>,
    connect_sender: mpsc::Sender<Option<F::Output>>,
}

#[derive(Clone)]
pub struct Pool<F: Factory> {
    pub inner: Arc<SharedPool<F>>,
}

impl<F: Factory> Pool<F> {
    async fn recycle(shared_pool_weak: Weak<SharedPool<F>>, mut rx: mpsc::Receiver<Option<F::Output>>) {
        use futures::stream::StreamExt;
        while let Some(conn) = StreamExt::next(&mut rx).await {
            if let Some(shared_pool) = shared_pool_weak.upgrade() {
                let conn = conn.and_then(|conn| if F::is_broken(&conn) { None } else { Some(conn) });
                let mut pool = shared_pool.inner.lock().await;
                pool.put_back(conn);
            } else {
                log::info!("Pool was dropped, stop the recycle.");
                break;
            }
        }
    }

    pub async fn with_num(num: usize, factory: F) -> Pool<F> {
        use tokio::task::spawn;
        let mut conns = VecDeque::with_capacity(num);
        for _ in 0..num {
            conns.push_back(factory.make().await.ok());
        }
        let waiters = VecDeque::new();
        let internal_pool = InternalPool { waiters, conns, num };

        let (tx, rx) = mpsc::channel::<Option<F::Output>>(num);

        let shared_pool = Arc::new(SharedPool {
            inner: Mutex::new(internal_pool),
            factory,
            connect_sender: tx,
        });

        spawn(Pool::recycle(Arc::downgrade(&shared_pool), rx));
        Pool { inner: shared_pool }
    }

    pub async fn get(&self) -> Result<Connect<F>, F::Error> {
        use futures::channel::oneshot::Canceled;
        use std::time::Duration;

        let timeout_ms = 500;

        let pool = Arc::downgrade(&self.inner);
        let mut internal = self.inner.inner.lock().await;

        if internal.conns.len() > internal.num {
            let mut conns: VecDeque<Option<F::Output>> = VecDeque::new();
            std::mem::swap(&mut conns, &mut internal.conns);
            internal.conns = conns.into_iter().take(internal.num).collect();
        }

        for conn in internal.conns.iter_mut() {
            // A `conn` of `None` means that the original connection is broken.
            if conn.is_none() {
                match self.inner.factory.make().await {
                    Ok(fixed_connection) => *conn = Some(fixed_connection),
                    Err(e) => {
                        log::error!(
                            "Failed to establish connection with database, retry after 0.5 second: {}",
                            e
                        );
                        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                        match self.inner.factory.make().await {
                            Ok(fixed_connection) => *conn = Some(fixed_connection),
                            Err(e) => {
                                log::error!("Failed to establish connection with database (2/2) {}", e);
                                return Err(e);
                            }
                        }
                    }
                }
            }
        }

        let conn = if let Some(conn) = internal.conns.pop_front() {
            drop(internal);
            if let Some(conn) = conn {
                conn
            } else {
                log::error!("Unexpected! `conn` remains `None`");
                self.inner.factory.make().await?
            }
        } else {
            log::warn!("All connections is busy.");

            let (tx, rx) = oneshot::channel::<F::Output>();
            internal.waiters.push_back(tx);
            drop(internal);
            match tokio::time::timeout(Duration::from_millis(timeout_ms), rx).await {
                Ok(Ok(connection)) => connection,
                Ok(Err(Canceled)) | Err(_) => self.inner.factory.make().await?,
            }
        };
        Ok(Connect {
            connect: Some(conn),
            pool,
        })
    }
}

#[tokio::test]
#[allow(unused_variables)]
async fn pool_test() -> Result<(), tokio_postgres::Error> {
    use crate::database::pool::PostgresFactory;
    let config = PostgresFactory::new();
    let pool = Pool::with_num(10, config).await;
    for _ in 0..100 {
        let db = pool.get().await?;
        let db = pool.get().await?;
        let db = pool.get().await?;
        let db = pool.get().await?;
        let db = pool.get().await?;
        let db = pool.get().await?;
        let mut db = pool.get().await?;
        db.connect.take();
        let db = pool.get().await?;
        let db = pool.get().await?;
        let db = pool.get().await?;
    }
    Ok(())
}

#[async_trait]
pub trait Factory: Send + Sync + 'static {
    type Output: Send;
    type Error: std::fmt::Display;

    fn is_broken(connection: &Self::Output) -> bool;
    async fn make(&self) -> Result<Self::Output, Self::Error>;
}
