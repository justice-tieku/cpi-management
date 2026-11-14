Document Control

Item
Description
Document title
Church Management System — Detailed Specification
Version
1.0
Purpose
Define the system's modules, workflows, roles, permissions, data requirements, security controls and phased implementation.
Primary roles
Pastor/Admin and Shepherd
Key rule
Pastor/Admin has church-wide oversight. Shepherds manage only members assigned to them.
Explicit exclusion
Family management is excluded from this specification.
 
Table of Contents
·         1. Executive Summary
·         2. Goals and Scope
·         3. Users, Roles and Permissions
·         4. Navigation and Dashboards
·         5. Member Management
·         6. Shepherd Assignment Management
·         7. Attendance Management
·         8. Follow-Up and Member Care
·         9. First-Timer and Visitor Tracking
·         10. Church Services, Events and Calendar
·         11. Departments and Ministries
·         12. Finance and Accounting
·         13. Sermons, Media and Communications
·         14. Discipleship, Groups and Pastoral Care
·         15. Welfare, Children and Youth
·         16. Workers, Volunteers and HR
·         17. Assets, Facilities and Inventory
·         18. Outreach and Evangelism
·         19. Website, Member Portal and Documents
·         20. Reports and Analytics
·         21. Notifications and Automation
·         22. System Administration and Audit Logs
·         23. Data Model
·         24. Security, Privacy and Reliability
·         25. Recommended Technology
·         26. Core Workflows
·         27. MVP and Phased Roadmap
·         28. Acceptance Criteria and Testing
·         29. Risks and Mitigations
·         30. Development Handover Checklist
·         Appendix A. Suggested Statuses and Fields
Note: In Microsoft Word, the headings can be used to create an automatic table of contents if desired.
 
1. Executive Summary
The Church Management System (CMS) is a centralized digital platform for managing church membership, attendance, shepherd assignments, follow-ups, services, departments, finances, media, communications, events, pastoral care, reports and day-to-day administration.
The system must provide one reliable source of church information. The Pastor/Admin dashboard consolidates information across the church and provides authorized oversight of shepherds, member records, attendance, follow-up activity and other enabled modules. Each Shepherd has a restricted workspace containing only the members assigned to that shepherd and the permitted functions needed to care for them.
The system must enforce permissions in the backend and database—not merely hide menu items. A shepherd must not be able to access another shepherd's members by changing a URL, guessing an ID, calling an API directly or downloading an export.
Family management is deliberately out of scope. Do not create a family-management module, family profiles, family groupings or family relationship tables as part of this project.
2. Goals and Scope
2.1 Main goals
·         Maintain accurate, searchable and secure member records.
·         Assign each member to a responsible shepherd and preserve assignment history.
·         Record attendance per service and make church-wide attendance visible to authorized administrators.
·         Make follow-up work measurable through tasks, reminders, notes and completion status.
·         Give shepherds the tools to register members and update records within their authority.
·         Give the Pastor/Admin a consolidated dashboard with church-wide reports and oversight.
·         Reduce duplicate records, missed follow-ups, paper-based registers and fragmented spreadsheets.
·         Support future modules without requiring a complete redesign.
·         Provide responsive access on desktop, tablet and mobile devices.
2.2 In scope
Membership, assignments, attendance, follow-up, first-timer tracking, services, events, departments, finance, sermons/media, communication, discipleship/groups, pastoral care, welfare, children/youth, workers/volunteers, assets/facilities, outreach, documents, analytics, system administration, security and backups.
2.3 Out of scope
·         Family management and family relationship records.
·         Unrestricted access by all church workers to all member information.
·         Treating a hidden frontend page as sufficient authorization.
·         Deleting historical attendance, financial transactions or assignment records without an audited correction process.
3. Users, Roles and Permissions
3.1 Pastor/Admin
The Pastor/Admin is the principal church-wide administrator. This role has visibility across all shepherds and all church records that the role is authorized to access. If finance, counselling or child-protection information needs extra confidentiality, use explicit permissions even for administrative users, rather than assuming every administrator should automatically see every sensitive note.
·         View, search and filter all member records.
·         Create, edit, verify, deactivate and archive member records according to policy.
·         Create shepherd accounts, activate/deactivate them, reset access and manage permissions.
·         Assign and reassign members to shepherds; view current and historical assignments.
·         View each shepherd's assigned members, attendance, follow-ups, tasks and submitted reports.
·         View consolidated church-wide attendance, membership trends, first-timer tracking and follow-up performance.
·         Review unassigned members, missing attendance, overdue follow-ups and workload distribution.
·         Manage services, events, departments, announcements and enabled modules.
·         Access finance and other restricted modules only when the account has the relevant permission.
·         Configure system settings, report access, data retention and integrations.
·         View audit logs and export authorized reports.
3.2 Shepherd
A Shepherd is responsible for the spiritual care, attendance monitoring and follow-up of the members assigned to them. The shepherd's workspace must be limited to those members and approved functions.
·         View a list of currently assigned members and their permitted profile details.
·         Register a new member through the approved registration workflow.
·         Update permitted details for assigned members, such as contact details, address, membership status or other approved fields.
·         View attendance history for assigned members and record attendance when authorized.
·         Identify members who have missed services and create follow-up tasks.
·         Record follow-up attempts, dates, outcomes and next steps.
·         Submit periodic shepherd reports to the Pastor/Admin.
·         View personal workload, due tasks, overdue tasks and own performance statistics.
·         Receive notifications about assignments, follow-up deadlines and service schedules.
A shepherd must not be able to browse another shepherd's member list, read another shepherd's private notes, reassign members, manage roles, change system-wide settings, view restricted finance records or access pastor-only reports. The system must also prevent unauthorized deletion of member histories.
3.3 Optional future roles
Role
Possible scope
Important restriction
Finance Officer
Income, expenses, receipts, reconciliations and finance reports.
No access to shepherd-only notes unless separately authorized.
Department Leader
Members and activities within their department.
No church-wide member access by default.
Media Officer
Sermon uploads, media library and publishing workflow.
No access to finance or confidential member records.
Follow-Up Officer
Approved first-timer and follow-up queue.
Only the assigned or approved follow-up records.
Auditor
Read-only access to approved financial and audit records.
Cannot alter source transactions or member assignments.
Member
Own profile, own event registrations and permitted resources.
Cannot view other members' private information.
 
3.4 Permission design
Use role-based access control (RBAC) together with record-level restrictions. The Pastor/Admin role may have broad access, while a Shepherd's record access is filtered by the current assignment. Use least privilege: users receive only the permissions required for their duties.
Action
Pastor/Admin
Shepherd
View all members
Yes, subject to sensitive-field rules
No
View assigned members
Yes
Yes
Register a member
Yes
Yes, via approved workflow
Edit assigned member
Yes
Yes, permitted fields only
Edit another shepherd's member
Yes
No
Assign/reassign shepherd
Yes
No
Record attendance
Yes/authorized
For assigned members or authorized service workflow
View church-wide reports
Yes
No
View own shepherd report
Yes
Yes
Manage users and roles
Yes
No
View finance module
Only if permission granted
No by default
View audit logs
Yes/authorized
No by default
Delete historical records
No routine hard delete; audited correction process
No
 
3.5 Record ownership and assignment rules
·         Store both `created_by`/`registered_by` and the current shepherd assignment. The person who created a record is not necessarily the shepherd responsible for it later.
·         Maintain assignment history with start date, end date, who made the change and the reason where required.
·         When a member is reassigned, the new shepherd gains access from the effective assignment date; the previous shepherd loses current access unless explicitly granted a separate permission.
·         Historical activity should remain available to authorized administrators. A shepherd should see only the history allowed by policy.
·         New member registration should check for likely duplicates before creating a new record.
·         If automatic assignment is enabled, assign a new member to the registering shepherd only after the policy checks pass. Otherwise, mark the record as awaiting Pastor/Admin assignment.
4. Navigation and Dashboards
4.1 Pastor/Admin navigation
·         Dashboard
·         All Members
·         Shepherd Management
·         Member Assignments
·         Church Attendance
·         Shepherd Reports
·         First-Timers and Visitors
·         Departments and Ministries
·         Services and Events
·         Finance and Accounting
·         Sermons and Media
·         Pastoral Care and Welfare
·         Reports and Analytics
·         Users and Permissions
·         System Settings
·         Audit Logs
4.2 Shepherd navigation
·         My Dashboard
·         My Members
·         Register New Member
·         Attendance
·         Follow-Ups
·         My Reports
·         Notifications
·         My Profile
4.3 Pastor/Admin dashboard cards
·         Total active members, new registrations and membership changes.
·         Members assigned to each shepherd and members awaiting assignment.
·         Attendance totals and rates by service, date range and shepherd.
·         Members absent for a configurable number of services.
·         Follow-ups due, overdue and completed.
·         First-timers registered, contacted and returning.
·         Upcoming services, events and important tasks.
·         Finance summaries only if the current user has finance permissions.
·         Trends over time, data-quality warnings and recent audited changes.
4.4 Shepherd dashboard cards
·         My assigned members.
·         New members registered recently.
·         Attendance present, absent, excused and not yet recorded.
·         Follow-ups due today and overdue.
·         Members not contacted recently.
·         Recent member updates and upcoming services.
·         My submitted reports and items requiring completion.
Dashboard cards must open filtered lists, not expose information outside the user's permissions. Counts and charts must be calculated using the same authorization rules as the underlying records.
5. Member Management
5.1 Member profile
Each member should have one canonical profile. Avoid duplicate member records and avoid collecting information that the church does not need.
Field group
Suggested fields
Identity
Unique member ID, first name, last name, preferred name, profile photo (optional), date of birth (optional and access-restricted).
Contact
Primary phone, alternate phone (optional), email (optional), preferred contact method.
Location
City/town, area/community, postal address if needed; avoid collecting unnecessary precise location.
Membership
Registration date, membership status, membership type, date joined, source/referral (optional).
Church involvement
Department(s), ministry/serving status, discipleship/group assignment if enabled.
Shepherd responsibility
Current shepherd, assignment start date, assignment status.
Record administration
Created by, created at, updated by, updated at, verification status.
Consent and preferences
Contact consent, communication preferences, consent timestamp where applicable.
Notes
General notes separated from confidential pastoral/counselling notes.
 
5.2 Member list and search
·         Search by name, member ID, phone or other approved identifier.
·         Filter by status, shepherd, registration date, department, attendance pattern or assignment status.
·         Sort and paginate results; do not load the entire church database into a shepherd's browser.
·         Show clear status labels and the current assigned shepherd to authorized users.
·         Restrict exports to approved roles and log sensitive exports.
5.3 Registration workflow
1.       The user opens Register New Member and completes the required fields.
2.       The system validates required fields and normalizes phone/email values.
3.       The system searches for possible duplicates and asks the user to review a match before creating another profile.
4.       The system records who registered the member and the registration timestamp.
5.       The member is assigned according to the church's assignment policy, or placed in an unassigned queue for the Pastor/Admin.
6.       The member appears in the Pastor/Admin's consolidated list and in the responsible shepherd's list when assignment is active.
7.       The system records an audit event and optionally sends an authorized confirmation or follow-up reminder.
5.4 Member status and lifecycle
Suggested statuses: Pending Verification, New Member, Active, Inactive, Transferred, and Deceased. The church should define what each status means and which actions are allowed. Status changes must preserve history. Deactivation should not erase the profile or historical attendance.
5.5 Member profile permissions
The Pastor/Admin can view and edit permitted fields across the church. Shepherds can view and update only assigned members and only the fields authorized for the Shepherd role. Highly sensitive pastoral, counselling, welfare or child-related details should be stored separately with narrower permissions.
6. Shepherd Assignment Management
6.1 Assignment screen
The Pastor/Admin needs a dedicated assignment screen showing shepherd name, assigned-member count, new assignments, unassigned members, workload, overdue follow-ups and assignment history.
6.2 Assignment actions
·         Assign one member or a selected group of members to a shepherd.
·         Reassign a member from one shepherd to another.
·         Move a member into an unassigned queue when necessary.
·         Record the effective date and optional reason for the change.
·         Preview the number of members affected before bulk assignment.
·         Prevent invalid assignments to inactive or disabled shepherd accounts.
·         Retain a history of previous assignments for reporting and accountability.
6.3 Assignment rules
·         Each member should have at most one primary shepherd at a time unless the church explicitly supports co-shepherding.
·         A member must not silently disappear from all responsible queues during reassignment.
·         A previous shepherd should lose access to current member data after reassignment unless a separate approved permission exists.
·         The Pastor/Admin can identify unassigned members and assign them.
·         Reports must use a clearly defined date range and assignment rule to avoid double-counting reassigned members.
7. Attendance Management
7.1 Attendance records
Attendance must be recorded against a specific service or meeting and a specific member. Each record should include member ID, service ID, attendance status, recorded by, timestamp and any approved correction history.
7.2 Attendance statuses
Status
Meaning
Present
The member attended the service.
Absent
The member did not attend and no approved excuse is recorded.
Excused
The member was absent with a reason accepted under church policy.
Not Recorded
No attendance decision has been entered yet; this is not the same as absent.
 
7.3 Attendance workflow
8.       Pastor/Admin or an authorized worker creates the service record and attendance session.
9.       Attendance is recorded using a searchable member list, roster or approved check-in process.
10.    A shepherd may record or review attendance only for members and services within their permission scope.
11.    The system prevents duplicate attendance entries for the same member and service.
12.    Missing entries remain Not Recorded until completed; they must not automatically become Absent.
13.    Corrections record who changed the status, when, and the old and new values.
14.    The Pastor/Admin dashboard updates totals and rates after authorized attendance changes.
15.    Absence rules can create follow-up tasks after a configurable number of missed services.
7.4 Attendance reports
·         Attendance by service, date, month, department, shepherd and branch if enabled.
·         Member attendance history and absence streaks.
·         Present, absent, excused and not-recorded counts.
·         Attendance percentage using a documented formula and excluding not-recorded entries.
·         List of members who may need follow-up.
·         Comparison of attendance trends across time periods.
8. Follow-Up and Member Care
8.1 Follow-up tasks
A follow-up task connects a member with an assigned responsible user, due date, reason and outcome. Examples include welcoming a new member, contacting an absent member, checking on a member, or following up after a service.
8.2 Suggested fields
·         Task ID, member ID, task type, assigned user, created by, due date, priority, status, next action, completion date and permitted notes.
·         Statuses: Open, In Progress, Waiting, Completed, Cancelled and Overdue (overdue can be calculated from status and due date).
8.3 Follow-up workflow
16.    A task is created manually or from an approved trigger such as a first visit or repeated absence.
17.    The responsible shepherd receives a notification and sees the task on their dashboard.
18.    The shepherd records each contact attempt, date, channel and outcome.
19.    If more action is needed, the shepherd sets a next action and due date.
20.    Completed tasks remain in history; they are not silently deleted.
21.    The Pastor/Admin can view follow-up completion and overdue patterns across shepherds.
8.4 Confidentiality
Use separate general follow-up notes and restricted pastoral/counselling notes. Shepherds should only see notes needed for their role. Do not place sensitive details in push notifications, email subjects or general dashboards.
9. First-Timer and Visitor Tracking
·         Capture visitor name (if provided), contact details (if consented), date of visit, service attended, invited by/referral source and preferred follow-up method.
·         Track visit sequence: First Visit, Contact Attempted, Contacted, Invited Back, Returned, Joined/Registered, or Closed.
·         Avoid duplicate visitor records using available contact information and a review process.
·         Assign each visitor to an authorized follow-up worker or shepherd.
·         Record contact attempts and outcomes without collecting unnecessary personal details.
·         Produce reports on first-time visitors, successful contacts, return visits and conversion to membership.
·         Respect opt-outs and communication preferences.
10. Church Services, Events and Calendar
10.1 Services
·         Create recurring and one-off services with date, start/end time, venue, service type, responsible team and attendance session.
·         Store sermon title, preacher, scripture references and media links where appropriate.
·         Support service templates for Sunday services, prayer meetings, Bible studies, special services and other church activities.
10.2 Events
·         Create events with description, date/time, venue, organizer, capacity, registration deadline, audience and status.
·         Support registrations, attendance, reminders, cancellations and post-event reports.
·         Allow authorized users to publish events to the church calendar or website.
10.3 Calendar
·         Provide month, week and list views; filter by service, department, venue or event type.
·         Detect venue/time conflicts and alert the organizer.