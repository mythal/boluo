use crate::error::ValidationFailed;

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
]);

pub static CHARACTER_NAME: Validator<str> = Validator(&[
    ("Name length shall not be empty.", &min!(1)),
    ("Name length shall not be more than 32.", &max!(32)),
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
}
