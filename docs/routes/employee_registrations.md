# `backend/app/routes/employee_registrations.py` — beginner line guide

**Job:** A Maker uploads people waiting to be registered; an Admin approves them into employee/account tables. Base URL: `/api/employee-registrations`.

## Setup — lines 1–11

- **1–3:** Import filesystem, random-ID, and time tools. The random ID makes temporary upload names hard to collide.
- **4:** Imports Flask request/config/login/JSON helpers.
- **5:** Cleans an uploaded filename before it is used.
- **6–7:** Import database session and models: pending registration, final employee, personal account, company, and audit history.
- **8:** Imports the spreadsheet/CSV parser. It reads the file rows; this route decides what to do with them.
- **9:** Imports the login guard.
- **11:** Creates the route group.

## `POST /upload` — lines 14–85

- **14–15:** Maker-only upload URL and its function.
- **17–27:** Gets the Maker’s own company and blocks inactive companies or a missing uploaded file.
- **28–34:** Takes the file, sanitises its name, and allows only configured spreadsheet/CSV extensions.
- **35:** Ensures the configured upload folder exists.
- **36–40:** Creates a unique temporary path using the user ID, UUID, and safe filename.
- **41:** Saves the browser upload to that temporary location.
- **42–49:** Calls `parse_employee_registration_file`. A parser error becomes `400`; `finally` removes the temporary file whether parsing worked or failed.
- **50–51:** Refuses a file that produced no usable rows.
- **52–67:** For each parsed row, finds an already-pending registration with the same company/email. It updates that pending row, or adds a new `EmployeeRegistration` row. `**row` supplies the parser’s named fields.
- **68–77:** Adds a corporate audit entry recording file name and row count.
- **78:** Saves all registration/audit changes.
- **79–85:** Responds with how many registrations were sent to Admin, using `201 Created`.

## `GET /` — lines 88–97

- **88–89:** Admin-only list URL.
- **90–92:** Reads optional company ID and a status (pending by default), then starts a matching query.
- **93–94:** Narrows to a company only when an ID is supplied.
- **95–96:** Sorts newest first, converts every pending row to JSON, and returns it.

## `POST /<registration_id>/approve` — lines 100–167

- **100–101:** Admin-only approval URL.
- **102–111:** Finds a pending registration and active company; missing/not-pending gives `404`, inactive company gives `403`.
- **112–132:** Searches for an existing employee using company plus wallet phone. If absent, creates an active `Employee`; otherwise updates that employee with submitted details.
- **133–142:** Makes an active personal `Account` if its phone number does not already exist.
- **143:** Marks the registration approved and records reviewer/time.
- **144–157:** Adds an Admin audit record containing the approved registration’s identifiers.
- **158:** Saves employee, account, registration, and audit record.
- **159–167:** Returns the final employee JSON.

## `POST /bulk-approve` — lines 170–259

- **170–171:** Admin-only endpoint for approving several rows in one request.
- **172–182:** Reads `registration_ids` from JSON and requires a non-empty list of unique integers.
- **184–189:** Loads all matching rows and ensures every requested row exists and is still pending.
- **190–199:** Loads each company and blocks the whole request if any company is inactive.
- **201–247:** Repeats the same final-employee/account creation-or-update work for each registration, marks it approved, and creates its audit record.
- **248:** One commit saves the complete group.
- **249–259:** Returns the number approved.

## Connections

`frontend/src/components/EmployeeRegistrationTab.tsx` uploads templates; `upay-admin/src/app/registrations/` lists and approves them. This file uses `excel_parser.py` for input, then passes accepted people to `Employee` and `Account`, which payroll validation in `batches.py` later reads.
