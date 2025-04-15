use serde::Deserialize;

use crate::entities;

#[derive(Debug, Deserialize, Clone, Copy)]
pub struct LegacySpan {
    pub start: i32,
    pub offset: i32,
}

impl Into<entities::Span> for LegacySpan {
    fn into(self) -> entities::Span {
        entities::Span {
            start: self.start,
            len: self.offset,
        }
    }
}

#[derive(Debug, Deserialize, Clone)]
pub struct LegacyLink {
    #[serde(flatten)]
    pub span: LegacySpan,
    pub href: String,
    #[serde(default)]
    pub title: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct LegacyExpr {
    #[serde(flatten)]
    pub span: LegacySpan,
    pub node: entities::ExprNode,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum LegacyEntity {
    Text(LegacySpan),
    Link(LegacyLink),
    Expr(LegacyExpr),
    Code(LegacySpan),
    CodeBlock(LegacySpan),
    Strong(LegacySpan),
    Emphasis(LegacySpan),
}

impl Into<entities::Entity> for LegacyEntity {
    fn into(self) -> entities::Entity {
        use entities::{ChildText, Entity, ExprEntity, LinkEntity, SpanWithChild};
        match self {
            LegacyEntity::Text(span) => Entity::Text(span.into()),
            LegacyEntity::Link(link) => Entity::Link(LinkEntity {
                span: link.span.into(),
                href: entities::Href::Link(link.href),
                child: ChildText::Text(link.span.into()),
                title: link.title,
            }),
            LegacyEntity::Expr(expr) => Entity::Expr({
                ExprEntity {
                    span: expr.span.into(),
                    node: expr.node,
                }
            }),
            LegacyEntity::Code(span) => Entity::Code(SpanWithChild {
                span: span.into(),
                child: ChildText::Text(span.into()),
            }),
            LegacyEntity::CodeBlock(span) => Entity::CodeBlock(SpanWithChild {
                span: span.into(),
                child: ChildText::Text(span.into()),
            }),
            LegacyEntity::Strong(span) => Entity::Strong(SpanWithChild {
                span: span.into(),
                child: ChildText::Text(span.into()),
            }),
            LegacyEntity::Emphasis(span) => Entity::Emphasis(SpanWithChild {
                span: span.into(),
                child: ChildText::Text(span.into()),
            }),
        }
    }
}
