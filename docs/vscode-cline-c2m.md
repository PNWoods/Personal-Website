# VS Code + Cline + C2M (work laptop)

Use the home model from VS Code on a machine where nothing can be installed
except Marketplace extensions. The model runs at home behind the Cloudflare
tunnel; SQLcl (bundled with the Oracle SQL Developer extension) gives Cline
direct read access to the C2M database.

```
VS Code (work laptop, VPN) ── Cline ──▶ https://ollama.pnwoods.com/v1 (Access token) ──▶ home laptop Ollama
                    └── SQLcl MCP server (bundled in the SQL Developer extension) ──▶ C2M (Oracle)
```

Prerequisites already done on the home side: Ollama default context 131072,
`OLLAMA_NUM_CTX=131072` on Vercel, Access service token `vs-code-ollama`
added to the `service-token` policy.

## 1. Prove the tunnel works from the work laptop

PowerShell (no install needed). Replace the two placeholders with the
`vs-code-ollama` token values from Cloudflare:

```powershell
Invoke-RestMethod -Uri https://ollama.pnwoods.com/api/tags -Headers @{
  'CF-Access-Client-Id'     = '<client id>'
  'CF-Access-Client-Secret' = '<client secret>'
} | Select-Object -ExpandProperty models | Select-Object name
```

Expected: a list that includes `qwen3.6:35b-a3b-coding`.

| Result | Meaning |
| --- | --- |
| model list | good, continue |
| `403` | token is not on the Access policy (Access controls → Policies → `service-token`) |
| hangs / DNS error | the VPN blocks `*.pnwoods.com`; try off VPN once to confirm |

## 2. Install and configure Cline

1. Extensions → search **Cline** → Install.
2. Open Cline (robot icon in the activity bar) → gear icon → **API Configuration**:

| Field | Value |
| --- | --- |
| API Provider | **OpenAI Compatible** |
| Base URL | `https://ollama.pnwoods.com/v1` |
| API Key | `ollama` (anything; Ollama ignores it, but Cline requires a value) |
| Model ID | `qwen3.6:35b-a3b-coding` |
| Custom Headers | `CF-Access-Client-Id` = client id, `CF-Access-Client-Secret` = client secret |
| Supports Images | off |
| Supports browser use | off |
| Enable R1 messages format | off |
| Context Window Size | `131072` |
| Max Output Tokens | `8192` |
| Temperature | `0.2` |

   Prices can stay 0. Do the same for both **Plan** and **Act** modes if
   Cline asks separately.
3. Type `say hi` in the Cline chat. First reply after the model has been idle
   for 30 minutes takes ~25 s (model load); after that a few seconds.

Why OpenAI Compatible and not the Ollama provider: the Ollama provider has
no place for the two Access headers.

## 3. Oracle SQL Developer extension

1. Extensions → **Oracle SQL Developer Extension for VSCode** → Install
   (it bundles SQLcl and its own Java; nothing else to install).
2. SQL Developer icon in the activity bar → **Connections → +** → fill in the
   C2M host, port, service name, user, password → **Save password** →
   **Test** → **Save**. Name it something short, e.g. `c2m`.
3. Open a SQL worksheet on that connection and run
   `select count(*) from ci_per;` once, so you know the connection itself works.

Use a read-only account (or a dev/test database). Cline will run whatever
SQL it decides on; the account's grants are the real guard.

## 4. Register SQLcl as an MCP server in Cline

1. Find the bundled SQLcl. In VS Code's terminal (PowerShell):

   ```powershell
   Get-ChildItem "$env:USERPROFILE\.vscode\extensions" -Directory -Filter 'oracle.sql-developer*' |
     ForEach-Object { Join-Path $_.FullName 'sqlcl\bin\sql.exe' } | Where-Object { Test-Path $_ }
   ```

   It prints the full path, something like
   `C:\Users\<you>\.vscode\extensions\oracle.sql-developer-25.3.0\sqlcl\bin\sql.exe`.
2. Cline → **MCP Servers** icon (the stacked-servers icon at the top of the
   Cline panel) → **Configure MCP Servers**. That opens `cline_mcp_settings.json`.
   Paste, with the path from step 1 and backslashes doubled:

   ```json
   {
     "mcpServers": {
       "sqlcl": {
         "command": "C:\\Users\\<you>\\.vscode\\extensions\\oracle.sql-developer-25.3.0\\sqlcl\\bin\\sql.exe",
         "args": ["-mcp"],
         "timeout": 120,
         "disabled": false,
         "autoApprove": []
       }
     }
   }
   ```

3. Save. The MCP panel should show `sqlcl` with a green dot and five tools:
   `list-connections`, `connect`, `disconnect`, `run-sql`, `run-sqlcl`.
4. First real test, in the Cline chat:

   > List the available database connections, connect to c2m, and describe
   > the columns of CI_ACCT_PER.

   Cline calls `list-connections`, `connect`, then `run-sql`. Approve each
   tool call the first time (or add `run-sql` to `autoApprove` later).

If `list-connections` comes back empty: the extension's saved connection was
not written to SQLcl's store. Save one directly. In VS Code's terminal:

```powershell
& "<path from step 1>" /nolog
```

then inside SQLcl:

```
connect -save c2m -savepwd <user>/<password>@//<host>:<port>/<service>
exit
```

Restart the MCP server from the MCP panel and try again.

## 5. Custom instructions for Cline (recommended)

Cline → gear → **Custom Instructions**. Paste:

```
When working with the C2M database through the sqlcl MCP server:
- Run SELECT statements only. Never run INSERT, UPDATE, DELETE, MERGE, DDL, or PL/SQL that changes data.
- Explore the schema with ALL_TAB_COLUMNS, ALL_CONSTRAINTS and ALL_CONS_COLUMNS before guessing column names.
- Always add FETCH FIRST 50 ROWS ONLY to data queries unless I ask for more.
- Prefer CI_* base tables; explain joins in one line each.
- Oracle SQL syntax only.
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `403` from the base URL | token missing from the `service-token` policy, or a typo in a header value |
| First request fails with a 524 / timeout, second works | cold model load plus a large prompt exceeded Cloudflare's 100 s first-byte limit; just retry |
| Replies start with a `<think>` block or are very slow | Ollama's OpenAI endpoint cannot turn thinking off; tell Patrick, the fix is a Modelfile variant with thinking disabled |
| Replies stall for ~20 s at the start of *every* message | some client is asking for a different context size; check Cline's Context Window Size is exactly `131072` |
| MCP server red / "connection closed" | run the `sql.exe -mcp` path by hand in the terminal to see the error; usually the path is wrong |
| `run-sql` fails with ORA-01031 | the account lacks SELECT on that table; expected on a read-only user for some objects |

## Notes

- SQLcl tags every statement it runs through MCP with a comment identifying
  it as AI-generated, visible to DBAs in session history. Good.
- Query results go from the work laptop to the home laptop through the model.
  Table definitions are harmless; rows from customer tables are customer
  data leaving the network. Start with schema questions, keep `FETCH FIRST`
  small, and prefer a dev/test database for anything with real rows.
- Roo Code works the same way (OpenAI Compatible provider with custom
  headers, same MCP JSON under Roo's MCP settings).
