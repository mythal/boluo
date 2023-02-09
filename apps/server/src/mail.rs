pub async fn send(to: &str, subject: &str, html: &str) -> Result<(), anyhow::Error> {
    let client = reqwest::Client::new();
    let domain = std::env::var("MAILGUN_DOMAIN")?;
    let api_key = std::env::var("MAILGUN_API_KEY")?;
    let url = format!("https://api.mailgun.net/v3/{domain}/messages");

    let mut params = std::collections::HashMap::new();
    let from = format!("Boluo <noreply@{domain}>");
    params.insert("from", &*from);
    params.insert("to", to);
    params.insert("subject", subject);
    params.insert("html", html);

    let mut url = reqwest::Url::parse(&url)?;
    url.set_username("api").unwrap();
    url.set_password(Some(&*api_key)).unwrap();
    let res = client.post(url).form(&params).send().await?;
    if res.status() != reqwest::StatusCode::OK {
        log::warn!("{}", res.text().await?);
    }
    Ok(())
}
