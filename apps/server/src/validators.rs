use crate::error::ValidationFailed;
use std::collections::HashSet;
use unicode_normalization::UnicodeNormalization;

const TAG_MAX_LEN: usize = 60;
const TAG_MAX_COUNT: usize = 64;

pub fn normalize_tags(tags: Vec<String>) -> Result<Vec<String>, ValidationFailed> {
    let mut seen = HashSet::new();
    let mut normalized = Vec::new();
    for tag in tags {
        let tag = tag.trim().nfc().collect::<String>();
        if tag.is_empty() {
            continue;
        }
        if tag.chars().count() > TAG_MAX_LEN {
            return Err(ValidationFailed("Tag is too long (max 60)."));
        }
        if seen.insert(tag.clone()) {
            normalized.push(tag);
        }
    }
    if normalized.len() > TAG_MAX_COUNT {
        return Err(ValidationFailed("Too many tags (max 64)."));
    }
    Ok(normalized)
}

pub type ValidateFn<T> = dyn Fn(&T) -> bool + Sync;
pub struct Validator<'a, T: ?Sized>(&'a [(&'static str, &'a ValidateFn<T>)]);

impl<T: ?Sized> Validator<'_, T> {
    pub fn run<U: AsRef<T>>(&self, value: U) -> Result<(), ValidationFailed> {
        let Validator(sub_validators) = *self;
        for (message, validator) in sub_validators {
            if !validator(value.as_ref()) {
                return Err(ValidationFailed(message));
            }
        }
        Ok(())
    }
}

macro_rules! min {
    ($n: expr) => {
        |s| s.chars().count() >= $n
    };
}

macro_rules! max {
    ($n: expr) => {
        |s| s.chars().count() <= $n
    };
}

macro_rules! is_match {
    ($pattern: expr) => {
        |s| regex!($pattern).is_match(&*s)
    };
}

pub static PASSWORD: Validator<str> = Validator(&[
    ("Password length shall not be less than 8.", &min!(8)),
    ("Password length shall not be more than 128.", &max!(128)),
]);

pub static NAME: Validator<str> = Validator(&[
    ("Name length shall not be less than 3.", &min!(3)),
    ("Name length shall not be more than 32.", &max!(32)),
    (
        r#"Username can only contain letters, "_" and numbers."#,
        &is_match!(r"^[\w_\d]+$"),
    ),
]);

pub static DISPLAY_NAME: Validator<str> = Validator(&[
    ("Name length shall not be less than 2.", &min!(2)),
    ("Name length shall not be more than 32.", &max!(32)),
]);

pub static IDENT: Validator<str> = Validator(&[
    ("Identifier length shall not be empty.", &min!(1)),
    ("Identifier length shall not be more than 64.", &max!(64)),
    (
        "Identifier can only contain letters (including Unicode), numbers, emoji, and . ? _ - %.",
        &is_match!(r"^[\p{L}\p{N}\p{M}\p{So}.。_%?？:：、・—-]+$"),
    ),
]);

pub static NAMESPACED_TYPE: Validator<str> = Validator(&[
    ("Type must not be empty.", &min!(1)),
    ("Type must not be longer than 200 characters.", &max!(200)),
    (
        "Type must be a lowercase ASCII namespaced identifier such as core/text.",
        &is_match!(r"^[a-z0-9]+([._-][a-z0-9]+)*(/[a-z0-9]+([._-][a-z0-9]+)*)+$"),
    ),
]);

pub static CHARACTER_NAME: Validator<str> = Validator(&[
    ("Name length shall not be empty.", &min!(1)),
    ("Name length shall not be more than 32.", &max!(32)),
]);

pub static ASSET_NAME: Validator<str> = Validator(&[
    ("Asset name must not be empty.", &min!(1)),
    (
        "Asset name must not be longer than 100 characters.",
        &max!(100),
    ),
]);

pub static EMAIL: Validator<str> = Validator(&[
    ("E-mail address length shall not be less than 5.", &min!(5)),
    (
        "E-mail address length shall not be more than 254.",
        &max!(254),
    ),
    // How to validate an email address using a regular expression?
    // https://stackoverflow.com/q/201323
    ("Invalid e-mail address", &is_match!(r"^\S+@\S+\.\S+$")),
]);

pub static HEX_COLOR: Validator<str> =
    Validator(&[("Invalid color", &is_match!(r"#[0-9abcdef]{6}"))]);

pub static BIO: Validator<str> = Validator(&[("Bio shall not be more than 512.", &max!(512))]);

pub static TOPIC: Validator<str> = Validator(&[("Topic shall not be more than 128.", &max!(128))]);

pub static DESCRIPTION: Validator<str> =
    Validator(&[("Description shall not be more than 512.", &max!(512))]);

pub static DICE: Validator<str> =
    Validator(&[("Illegal dice format.", &is_match!(r"^d\d{1,3}|FATE$"))]);

#[test]
fn validator_test() {
    assert_eq!(PASSWORD.run("whoa!whoa!"), Ok(()));
    assert!(PASSWORD.run("whoa!").is_err());

    assert_eq!(NAME.run("whoa"), Ok(()));
    assert!(NAME.run("whoa whoa").is_err());
    assert!(NAME.run("").is_err());

    assert_eq!(DISPLAY_NAME.run("whoa"), Ok(()));
    assert!(DISPLAY_NAME.run("whoa whoa").is_ok());
    assert!(DISPLAY_NAME.run("").is_err());

    assert!(EMAIL.run("").is_err());
    assert!(EMAIL.run("example@example.com").is_ok());

    assert!(IDENT.run("HP:满").is_ok());
    assert!(IDENT.run("H").is_ok());
    assert!(IDENT.run("血").is_ok());
    assert!(IDENT.run("🎲").is_ok());
    assert!(IDENT.run("魔力：不足").is_ok());
    assert!(IDENT.run("SAN・低下？").is_ok());
    assert!(IDENT.run("状態—毒🙂").is_ok());
    assert!(IDENT.run("สถานะ:อ่อนแรง").is_ok());
    assert!(IDENT.run("기력:부족").is_ok());
    assert!(IDENT.run("HP/MP").is_err());

    assert!(NAMESPACED_TYPE.run("core/text").is_ok());
    assert!(NAMESPACED_TYPE.run("Text").is_err());

    assert_eq!(
        normalize_tags(vec![
            " Player ".to_string(),
            "player".to_string(),
            String::new(),
            "e\u{301}".to_string(),
            "é".to_string(),
        ]),
        Ok(vec![
            "Player".to_string(),
            "player".to_string(),
            "é".to_string(),
        ])
    );
}
