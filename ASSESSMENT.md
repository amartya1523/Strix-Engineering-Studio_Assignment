# Assessment coverage

| Assessment requirement | Implementation |
| --- | --- |
| Registration, login, logout, protected routes | Argon2 passwords; HttpOnly cookie; expiring, revocable database sessions; frontend route guard and backend ownership checks |
| Project creation, list, delete | Name, description, creation timestamp; source/review counts; deletion confirmation and database cascades |
| Code upload | ZIP **and** drag-and-drop multiple source files; stored in PostgreSQL and associated with a project |
| Code explorer | Collapsible folder tree, file preview, line numbers, Prism syntax highlighting, source-copy action |
| Single, multiple, entire-project review | Checkboxes select files; no selection means all project files |
| Structured results | Summary, issues with exact file/line references, recommendations, critical/high/medium/low severity filters |
| Three review templates | Security, performance, code quality |
| Review history | Persisted results; server-side search by project, mode and result content; paginated history; details and Markdown export |
| Chat with code | Persisted sessions/messages; lexical context retrieval; recent conversation context |
| Configurable AI | User-owned provider settings; base URL, model and encrypted key; edit, remove and connection test |
| Required providers | OpenAI, LM Studio, any OpenAI-compatible Chat Completions endpoint |
| Bonus provider support | Ollama, OpenRouter and Groq presets |
| Bonus feature 1 | Documentation generator: Markdown README, setup guide and API documentation |
| Bonus feature 2 | Architecture analysis: components, data flow, boundaries and tradeoffs |
| Submission structure and disclosure | Separate `frontend/`, `backend/`, plus `README.md`, `ARCHITECTURE.md`, `AI_USAGE.md` |

GitHub import, diff review and test generation are not implemented; ZIP/multiple-file upload and the two selected bonus features satisfy the assessment's choices.


For implementation decisions, see [ARCHITECTURE.md](ARCHITECTURE.md).
