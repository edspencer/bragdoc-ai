Task: Create a demo login mode with pre-populated data

## Specific Requirements

- The option to create a demo-mode account should be enabled/disabled via a new env var called DEMO_MODE_ENABLED

### UI Requirements

When enabled via env var, the login screen should allow login as normal, but underneath the usual login form, there should be a nice box in the UI inviting the user to try the free demo mode, with a link to /demo.

The new /demo page should be a very small page that explains to the user that a new account will be made for them with an anonymous email address and they'll be logged in. It'll be populated with some fake data that they're free to delete. They can try any of the features for free, and the demo account will be deleted once they logout.

- Unless the env var is present and set to true, the UI should not show anything to hint at the existence of a demo mode

### Backend requirements

We need a new endpoint that will create a user account for something like demo123456789@bragdoc.ai as the email address (where the number is perhaps the number of seconds since the beginning of 2025 to randomize it). The existing JSON import functionality should be used to load the ./packages/database/demo-data.json file, which has sample data for some Companies, Projects, Achievements and Documents.

Hitting this endpoint via the form submission on the /demo page should create the user, populate the data, mark the user as verified if we need to do that, and log the user in, then redirect them to /dashboard. There should never be a way to log in for that particular demo user again.

### Database updates

- Let's add a `demo` option to the userLevelEnum in schema.ts, with demo users being set to this.

- Also if adding that requires a database migration, let's update it to a TypeScript enum that we define in the schema.ts file, so that next time we need to change that enum we don't need another migration
