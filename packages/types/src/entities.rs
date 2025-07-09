use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(untagged)]
pub enum Href {
    Link(String),
    Position(Span),
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type, Copy)]
pub struct Span {
    pub start: i32,
    pub len: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(tag = "type")]
pub enum ChildText {
    Text(Span),
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub struct LinkEntity {
    #[serde(flatten)]
    pub span: Span,
    pub href: Href,
    pub child: ChildText,
    #[serde(default)]
    pub title: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub struct ExprEntity {
    #[serde(flatten)]
    pub span: Span,
    pub node: ExprNode,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub struct SpanWithChild {
    #[serde(flatten)]
    pub span: Span,
    pub child: ChildText,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(tag = "type")]
pub enum Entity {
    Text(Span),
    Link(LinkEntity),
    Code(SpanWithChild),
    CodeBlock(SpanWithChild),
    Strong(SpanWithChild),
    Emphasis(SpanWithChild),
    StrongEmphasis(SpanWithChild),
    Expr(ExprEntity),
}

#[derive(Debug, Serialize, Deserialize, Clone, Default, specta::Type)]
#[serde(tag = "type")]
#[non_exhaustive]
pub enum ExprNode {
    Roll(Roll),
    Binary(Binary),
    Num {
        value: f64,
    },
    Max {
        node: RollNode,
    },
    Min {
        node: RollNode,
    },
    SubExpr {
        node: Box<ExprNode>,
    },
    CocRoll(Box<CocRoll>),
    DicePool(Box<DicePool>),
    FateRoll,
    Repeat(Repeat),
    #[default]
    Unknown,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(tag = "type")]
pub enum RollNode {
    Roll(Roll),
}

#[derive(Debug, Serialize, Deserialize, Clone, Default, specta::Type)]
#[serde(tag = "type")]
pub enum PureExprNode {
    Binary(PureBinary),
    Num {
        value: f64,
    },
    SubExpr {
        node: Box<PureExprNode>,
    },
    Repeat(PureRepeat),
    #[default]
    Unknown,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DicePool {
    counter: i32,
    face: i32,
    min: i32,
    addition: i32,
    #[serde(default)]
    critical: Option<i32>,
    #[serde(default)]
    fumble: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Repeat {
    node: Box<ExprNode>,
    count: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PureRepeat {
    node: Box<PureExprNode>,
    count: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CocRoll {
    sub_type: CocRollSubType,
    #[serde(default)]
    target: Option<Box<PureExprNode>>,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RollFilterType {
    Low,
    High,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub struct Roll {
    face: i32,
    counter: i32,
    #[serde(default)]
    filter: Option<(RollFilterType, i32)>,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
enum Operator {
    #[serde(rename = "+")]
    Plus,
    #[serde(rename = "-")]
    Minus,
    #[serde(rename = "×")]
    Multiply,
    #[serde(rename = "÷")]
    Divide,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default, specta::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[allow(non_camel_case_types)]
enum CocRollSubType {
    #[default]
    Normal,
    Bonus,
    Bonus_2,
    Penalty,
    Penalty_2,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub struct Binary {
    l: Box<ExprNode>,
    r: Box<ExprNode>,
    op: Operator,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub struct PureBinary {
    l: Box<PureExprNode>,
    r: Box<PureExprNode>,
    op: Operator,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(tag = "type")]
#[non_exhaustive]
pub enum EvaluatedExprNode {
    Roll(RollResult),
    Binary(BinaryResult),
    Num { value: f64 },
    Max { node: RollResultNode, value: f64 },
    Min { node: RollResultNode, value: f64 },
    SubExpr(SubExprResult),
    CocRoll(CocRollResult),
    FateRoll(FateResult),
    DicePool(DicePoolResult),
    Repeat(RepeatResult),
    Unknown { value: f64 },
}

impl Default for EvaluatedExprNode {
    fn default() -> Self {
        EvaluatedExprNode::Unknown { value: 0.0 }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub struct DicePoolResult {
    #[serde(flatten)]
    roll: DicePool,
    value: f64,
    values: Vec<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CocRollResult {
    #[serde(flatten)]
    roll: CocRoll,
    #[serde(default)]
    target_value: Option<f64>,
    value: f64,
    rolled: f64,
    modifiers: Vec<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SubExprResult {
    node: Box<ExprNode>,
    evaluated_node: Box<EvaluatedExprNode>,
    value: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub struct FateResult {
    value: u16,
    values: (u8, u8, u8, u8),
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub struct RepeatResult {
    #[serde(flatten)]
    repeat: Repeat,
    evaluated: Vec<EvaluatedExprNode>,
    value: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub struct BinaryResult {
    op: Operator,
    l: Box<EvaluatedExprNode>,
    r: Box<EvaluatedExprNode>,
    value: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub struct RollResult {
    #[serde(flatten)]
    roll: Roll,
    values: Vec<f64>,
    #[serde(default)]
    filtered: Option<Vec<f64>>,
    value: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(tag = "type")]
pub enum RollResultNode {
    Roll(RollResult),
}
