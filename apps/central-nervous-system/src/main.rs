use yew::{function_component, html, Html};
use yew_router::Routable;

mod nav;

#[derive(Clone, Copy, Routable, PartialEq, Debug)]
pub enum Route {
    #[at("/")]
    Root,
    #[at("/users")]
    Users,
    #[at("/user/:id")]
    User { id: String },
    #[at("/tasks")]
    Tasks,
    #[at("/task/:id")]
    Task { id: String },
}

#[function_component(App)]
fn app() -> Html {
    html!(
        <>
            <nav::Nav />
            <main>
                {"hello world"}
            </main>
        </>
    )
}

fn main() {
    yew::Renderer::<App>::new().render();
}
