use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ClientWebSocketCloseReason {
    ApiEndpointChanged,
    ChatContextDisposed,
    ChatStateReset,
    ConnectionError,
    ConnectionRejected,
    ConnectionReplaced,
    DebugDisconnect,
    LegacyBaseUrlChanged,
    LegacyConnectorDisposed,
    LegacyFailoverRouteChanged,
    LegacyPerformanceRouteChanged,
    ReconnectStarted,
    RetryRequested,
    SpaFailoverRouteChanged,
    SpaPerformanceRouteChanged,
    Unknown,
}

impl ClientWebSocketCloseReason {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::ApiEndpointChanged => "API_ENDPOINT_CHANGED",
            Self::ChatContextDisposed => "CHAT_CONTEXT_DISPOSED",
            Self::ChatStateReset => "CHAT_STATE_RESET",
            Self::ConnectionError => "CONNECTION_ERROR",
            Self::ConnectionRejected => "CONNECTION_REJECTED",
            Self::ConnectionReplaced => "CONNECTION_REPLACED",
            Self::DebugDisconnect => "DEBUG_DISCONNECT",
            Self::LegacyBaseUrlChanged => "LEGACY_BASE_URL_CHANGED",
            Self::LegacyConnectorDisposed => "LEGACY_CONNECTOR_DISPOSED",
            Self::LegacyFailoverRouteChanged => "LEGACY_FAILOVER_ROUTE_CHANGED",
            Self::LegacyPerformanceRouteChanged => "LEGACY_PERFORMANCE_ROUTE_CHANGED",
            Self::ReconnectStarted => "RECONNECT_STARTED",
            Self::RetryRequested => "RETRY_REQUESTED",
            Self::SpaFailoverRouteChanged => "SPA_FAILOVER_ROUTE_CHANGED",
            Self::SpaPerformanceRouteChanged => "SPA_PERFORMANCE_ROUTE_CHANGED",
            Self::Unknown => "UNKNOWN",
        }
    }
}

impl From<&str> for ClientWebSocketCloseReason {
    fn from(value: &str) -> Self {
        use serde::de::value::{Error, StrDeserializer};

        Self::deserialize(StrDeserializer::<Error>::new(value)).unwrap_or(Self::Unknown)
    }
}

impl std::fmt::Display for ClientWebSocketCloseReason {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.as_str())
    }
}

#[derive(Deserialize, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Token {
    pub token: Uuid,
    #[specta(type = f64)]
    pub issued_at: i64,
}

#[cfg(test)]
mod tests {
    use super::ClientWebSocketCloseReason;

    #[test]
    fn client_websocket_close_reason_wire_values_are_consistent() {
        let reasons = [
            ClientWebSocketCloseReason::ApiEndpointChanged,
            ClientWebSocketCloseReason::ChatContextDisposed,
            ClientWebSocketCloseReason::ChatStateReset,
            ClientWebSocketCloseReason::ConnectionError,
            ClientWebSocketCloseReason::ConnectionRejected,
            ClientWebSocketCloseReason::ConnectionReplaced,
            ClientWebSocketCloseReason::DebugDisconnect,
            ClientWebSocketCloseReason::LegacyBaseUrlChanged,
            ClientWebSocketCloseReason::LegacyConnectorDisposed,
            ClientWebSocketCloseReason::LegacyFailoverRouteChanged,
            ClientWebSocketCloseReason::LegacyPerformanceRouteChanged,
            ClientWebSocketCloseReason::ReconnectStarted,
            ClientWebSocketCloseReason::RetryRequested,
            ClientWebSocketCloseReason::SpaFailoverRouteChanged,
            ClientWebSocketCloseReason::SpaPerformanceRouteChanged,
            ClientWebSocketCloseReason::Unknown,
        ];

        for reason in reasons {
            assert_eq!(
                serde_json::to_string(&reason).unwrap(),
                format!("\"{}\"", reason.as_str())
            );
            assert_eq!(ClientWebSocketCloseReason::from(reason.as_str()), reason);
        }
        assert_eq!(
            ClientWebSocketCloseReason::from("FUTURE_REASON"),
            ClientWebSocketCloseReason::Unknown
        );
    }
}
