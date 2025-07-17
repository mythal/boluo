pub async fn send(to: &str, subject: &str, html: &str) -> Result<(), anyhow::Error> {
    let client = reqwest::Client::new();
    tracing::info!("Sending email to {to}");
    let domain = std::env::var("MAILGUN_DOMAIN").ok();

    let Some(domain) = domain else {
        tracing::info!(
            "MAILGUN_DOMAIN is not set, maybe you are running in local, skipping email sending and print the email content"
        );

        println!("To: {to}");
        println!("Subject: {subject}");
        println!("HTML:\n{html}");

        return Ok(());
    };

    let Ok(api_key) = std::env::var("MAILGUN_API_KEY") else {
        tracing::error!("MAILGUN_API_KEY is not set");
        return Err(anyhow::anyhow!(
            "The server is not configured to send emails"
        ));
    };

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
    if !res.status().is_success() {
        let error = res.text().await?;
        tracing::warn!(error, "Failed to send email");
        return Err(anyhow::anyhow!("Failed to send email"));
    }
    Ok(())
}
