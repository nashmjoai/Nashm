import re

with open("c:/Users/abdel/Desktop/rag_api-main/rag_api-main/app/config.py", "r", encoding="utf-8") as f:
    text = f.read()

# Replace get_env_variable definition
old_fn = """def get_env_variable(
    var_name: str, default_value: str = None, required: bool = False
) -> str:
    value = os.getenv(var_name)
    if value is None:
        if default_value is None and required:
            raise ValueError(f"Environment variable '{var_name}' not found.")
        return default_value
    return value"""

new_fn = """def get_env_variable(
    var_name: str, default_value: str = None, required: bool = False
) -> str:
    value = os.getenv(var_name)
    if value is None:
        if default_value is None and required:
            raise ValueError(f"Environment variable '{var_name}' not found.")
        return default_value
    if isinstance(value, str):
        value = value.strip('"\\'')
    return value"""

if old_fn in text:
    text = text.replace(old_fn, new_fn)
    print("Replaced get_env_variable")
else:
    print("old_fn not found")

text = re.sub(
    r'RAG_PORT\s*=\s*int\(.*?\)',
    'RAG_PORT = int(str(os.getenv("PORT", os.getenv("RAG_PORT", "8000"))).strip(\'"\\\'\'))',
    text
)
text = re.sub(
    r'RAG_HOST\s*=\s*os\.getenv\(.*?\)',
    'RAG_HOST = os.getenv("RAG_HOST", "0.0.0.0").strip(\'"\\\'\')',
    text
)

with open("c:/Users/abdel/Desktop/rag_api-main/rag_api-main/app/config.py", "w", encoding="utf-8") as f:
    f.write(text)

print("Saved config.py")
