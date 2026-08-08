#[derive(Clone, Default)]
pub struct Config {
    pub domain: Option<String>,
    pub api_key: Option<String>,
}

pub async fn send(
    config: &Config,
    to: &str,
    subject: &str,
    html: &str,
) -> Result<(), anyhow::Error> {
    use std::sync::LazyLock;
    use std::time::Duration;

    static CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
        reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(3))
            .timeout(Duration::from_secs(10))
            .build()
            .expect("Failed to build mail HTTP client")
    });
    tracing::info!("Sending email to {to}");

    let Some(domain) = config.domain.as_deref() else {
        tracing::info!(
            "Mailgun is not configured, maybe you are running locally; skipping email delivery and printing the email content"
        );

        println!("To: {to}");
        println!("Subject: {subject}");
        println!("HTML:\n{html}");

        return Ok(());
    };

    let Some(api_key) = config.api_key.as_deref() else {
        tracing::error!("Mailgun API key is not configured");
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
    url.set_password(Some(api_key)).unwrap();
    let res = CLIENT.post(url).form(&params).send().await?;
    if !res.status().is_success() {
        let error = res.text().await?;
        tracing::warn!(error, "Failed to send email");
        metrics::counter!("boluo_server_mail_send_failed_total").increment(1);
        return Err(anyhow::anyhow!("Failed to send email"));
    }

    metrics::counter!("boluo_server_mail_sent_total").increment(1);
    Ok(())
}
