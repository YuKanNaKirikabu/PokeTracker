from pathlib import Path


def extract_block(text, start_token):
    start = text.find(start_token)
    if start == -1:
        raise SystemExit(f"Token not found: {start_token}")
    brace_start = text.find("{", start)
    if brace_start == -1:
        raise SystemExit("No opening brace")
    i = brace_start
    depth = 0
    in_string = None
    escape = False
    while i < len(text):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == in_string:
                in_string = None
        else:
            if ch in ("'", '"', "`"):
                in_string = ch
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return text[start:i + 1]
        i += 1
    raise SystemExit("Unbalanced braces")


def main():
    text = Path("app.js").read_text(encoding="utf-8")
    lang_start = text.find("const LANGUAGE_OPTIONS")
    if lang_start == -1:
        raise SystemExit("LANGUAGE_OPTIONS not found")
    lang_end = text.find("];", lang_start)
    if lang_end == -1:
        raise SystemExit("LANGUAGE_OPTIONS end not found")
    lang_block = text[lang_start:lang_end + 2]

    i18n_block = extract_block(text, "const I18N")

    fn_start = text.find("function getCurrentLanguage")
    fn_end = text.find("function applyTheme", fn_start)
    if fn_start == -1 or fn_end == -1:
        raise SystemExit("Function block not found")
    fn_block = text[fn_start:fn_end]

    lang_block = lang_block.replace("const LANGUAGE_OPTIONS", "export const LANGUAGE_OPTIONS", 1)
    i18n_block = i18n_block.replace("const I18N", "export const I18N", 1)

    fn_block = fn_block.replace("function getCurrentLanguage", "export function getCurrentLanguage", 1)
    fn_block = fn_block.replace("function t(", "export function t(", 1)
    fn_block = fn_block.replace("function formatCardsCount", "export function formatCardsCount", 1)
    fn_block = fn_block.replace("function applyTranslations", "export function applyTranslations", 1)

    out = (
        "import { DEFAULT_LANGUAGE, state } from \"./state.js\";\n\n"
        + lang_block
        + "\n\n"
        + i18n_block
        + "\n\n"
        + fn_block.strip()
        + "\n"
    )
    Path("src/core/i18n.js").write_text(out, encoding="utf-8")
    print("i18n.js generated")


if __name__ == "__main__":
    main()
