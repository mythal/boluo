use yew::{function_component, html, Html};

mod nav;

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
