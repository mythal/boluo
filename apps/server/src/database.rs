use crate::error::DbError;
use std::collections::HashMap;
use std::convert::{From, Into};
use std::env;
use std::hash::BuildHasher;
pub use tokio_postgres::types::{ToSql, Type as SqlType};
use tokio_postgres::{Row, Statement};

use async_trait::async_trait;

pub mod pool;

pub use pool::get;

// workaround: https://github.com/dtolnay/async-trait/issues/48
#[derive(Eq, PartialEq, Hash, Copy, Clone)]
pub struct Sql(&'static str);

impl From<&'static str> for Sql {
    fn from(s: &'static str) -> Sql {
        Sql(s)
    }
}

#[async_trait]
pub trait Querist: Send {
    async fn query_typed<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        types: &[postgres_types::Type],
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<Vec<Row>, DbError>;

    async fn query<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<Vec<Row>, DbError> {
        self.query_typed(source, &[], params).await
    }

    async fn query_one_typed<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        types: &[postgres_types::Type],
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<Option<Row>, DbError>;

    async fn query_one<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<Option<Row>, DbError> {
        self.query_one_typed(source, &[], params).await
    }

    async fn query_exactly_one_typed<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        types: &[postgres_types::Type],
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<Row, DbError>;

    async fn query_exactly_one<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<Row, DbError> {
        self.query_exactly_one_typed(source, &[], params).await
    }

    async fn execute_typed<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        types: &[postgres_types::Type],
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<u64, DbError>;

    async fn execute<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<u64, DbError> {
        self.execute_typed(source, &[], params).await
    }
}

pub fn get_postgres_url() -> String {
    let key = if cfg!(test) {
        dotenv::dotenv().ok();
        "TEST_DATABASE_URL"
    } else {
        "DATABASE_URL"
    };

    env::var(key).expect("Failed to load Postgres connect URL")
}

pub struct CrcBuilder;

impl BuildHasher for CrcBuilder {
    type Hasher = crc32fast::Hasher;

    fn build_hasher(&self) -> crc32fast::Hasher {
        crc32fast::Hasher::new()
    }
}

pub type PrepareMap = HashMap<Sql, tokio_postgres::Statement, CrcBuilder>;

pub struct Client {
    pub client: tokio_postgres::Client,
    broken: bool,
    prepared: PrepareMap,
}

impl Client {
    pub async fn new() -> Result<Client, DbError> {
        Client::with_config(&get_postgres_url().parse().unwrap()).await
    }

    pub fn is_broken(&self) -> bool {
        self.broken
    }

    fn check_broken<T>(&mut self, input: Result<T, DbError>) -> Result<T, DbError> {
        if input.is_err() && self.client.is_closed() {
            self.mark_broken()
        }
        input
    }

    fn mark_broken(&mut self) {
        self.broken = true;
        log::warn!("A postgres connection was broken.");
    }

    pub async fn with_config(config: &tokio_postgres::Config) -> Result<Client, DbError> {
        let (client, connection) = config.connect(tokio_postgres::NoTls).await?;
        tokio::spawn(connection);
        let prepared = HashMap::with_capacity_and_hasher(64, CrcBuilder);
        let broken = false;
        Ok(Client {
            client,
            prepared,
            broken,
        })
    }

    pub async fn transaction(&'_ mut self) -> Result<Transaction<'_>, DbError> {
        if self.client.is_closed() {
            self.mark_broken()
        }
        let transaction = self.client.transaction().await?;
        let prepared = &mut self.prepared;
        Ok(Transaction { transaction, prepared })
    }

    async fn get_statement(&mut self, source: Sql, types: &[postgres_types::Type]) -> Result<Statement, DbError> {
        if let Some(statement) = self.prepared.get(&source) {
            Ok(statement.clone())
        } else {
            let prepared = self.client.prepare_typed(source.0, types).await;
            match prepared {
                Ok(statement) => {
                    self.prepared.insert(source, statement.clone());
                    Ok(statement)
                }
                Err(e) => {
                    if self.client.is_closed() {
                        self.mark_broken();
                    }
                    Err(e)
                }
            }
        }
    }
}

#[async_trait]
impl Querist for Client {
    async fn query_typed<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        types: &[postgres_types::Type],
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<Vec<tokio_postgres::Row>, DbError> {
        let statement = self.get_statement(source.into(), types).await?;
        self.check_broken(self.client.query(&statement, params).await)
    }

    async fn query_one_typed<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        types: &[postgres_types::Type],
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<Option<Row>, DbError> {
        let statement = self.get_statement(source.into(), types).await?;
        self.check_broken(self.client.query_opt(&statement, params).await)
    }

    async fn query_exactly_one_typed<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        types: &[postgres_types::Type],
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<Row, DbError> {
        let statement = self.get_statement(source.into(), types).await?;
        self.check_broken(self.client.query_one(&statement, params).await)
    }

    async fn execute_typed<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        types: &[postgres_types::Type],
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<u64, DbError> {
        let statement = self.get_statement(source.into(), types).await?;
        self.check_broken(self.client.execute(&statement, params).await)
    }
}

pub struct Transaction<'a> {
    pub transaction: tokio_postgres::Transaction<'a>,
    prepared: &'a mut PrepareMap,
}

impl<'a> Transaction<'a> {
    pub async fn commit(self) -> Result<(), DbError> {
        self.transaction.commit().await
    }

    pub async fn rollback(self) -> Result<(), DbError> {
        self.transaction.rollback().await
    }

    async fn get_statement(&mut self, source: Sql, types: &[postgres_types::Type]) -> Result<Statement, DbError> {
        let mut statement = self.prepared.get(&source);
        if statement.is_none() {
            let prepared = self.transaction.prepare_typed(source.0, types).await?;
            self.prepared.insert(source, prepared);
            statement = self.prepared.get(&source);
        }
        Ok(statement.unwrap().clone())
    }
}

#[async_trait]
impl Querist for Transaction<'_> {
    async fn query_typed<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        types: &[postgres_types::Type],
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<Vec<tokio_postgres::Row>, DbError> {
        let statement = self.get_statement(source.into(), types).await?;
        self.transaction.query(&statement, params).await
    }

    async fn query_one_typed<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        types: &[postgres_types::Type],
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<Option<Row>, DbError> {
        let statement = self.get_statement(source.into(), types).await?;
        self.transaction.query_opt(&statement, params).await
    }

    async fn query_exactly_one_typed<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        types: &[postgres_types::Type],
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<Row, DbError> {
        let statement = self.get_statement(source.into(), types).await?;
        self.transaction.query_one(&statement, params).await
    }

    async fn execute_typed<T: Into<Sql> + Send>(
        &mut self,
        source: T,
        types: &[postgres_types::Type],
        params: &[&(dyn ToSql + Sync)],
    ) -> Result<u64, DbError> {
        let statement = self.get_statement(source.into(), types).await?;
        self.transaction.execute(&statement, params).await
    }
}
