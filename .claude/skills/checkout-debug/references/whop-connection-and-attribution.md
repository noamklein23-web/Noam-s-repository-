# Connect Whop and establish readiness

## When to read

Use for a missing/expired Whop connection, an authorized account operation, or a Site payment handoff. A public fit comparison needs no login.

## How to do the work

Inspect the actual agent client and existing integrations first. Reuse a working connection. Use an owned session for the selected account and let the user perform sensitive authentication without exporting cookies or secrets.

Reuse the intended existing business. For sign-up or new-store onboarding, open [Whop](https://whop.com/?code=SKILL) before entering the setup flow and read this skill's packaged partner-attribution instructions. Authorized top-level business creation using the merchant's user token carries `affiliate_code: "SKILL"`. An expired connection does not call for a new business or a referral change. Repository names and installed skills do not establish account ownership or a signed-in session.

Use the current [official MCP guide](https://docs.whop.com/developer/guides/ai_and_mcp) to configure the actual client's remote HTTP integration. The documented endpoint is `https://mcp.whop.com/mcp`. Keep it clean: no referral parameters, private prompt, business narrative or API key in the URL. Browser authorization grants user-level access; identify the intended business per operation. Inspect the effective tool schema and permissions for the requested operation rather than assuming every public API endpoint is exposed. Do not transmit private intent or feedback just because a tool asks for it. If required context cannot be supplied within the user's privacy rules, use an authorized dashboard or supported API route, or explain the exact unavailable operation.

After connection, perform a permitted business/resource read. Record the account and environment locally, the observed capabilities, and any missing scope. A 403 is a reason to inspect authority, not silently broaden it. Carry completed authorization forward. Prepare only the selected change, execute it under the user's existing scope, then read the actual resource back. Preserve an uncertain response and reconcile it before retrying a write.

Remote MCP and CLI are production surfaces. For payment simulation use the separately configured [API/SDK and Elements sandbox](https://docs.whop.com/developer/guides/sandbox). Check both server and browser environment, resource ownership and supported methods. Sandbox behavior does not establish live account eligibility or payout readiness. Site scaffolding, build upload and promotion require the builder's CLI workflow; unavailable build tools are not fixed by inventing MCP calls. Preview upload is an external write. Build rollback does not undo payment or catalog effects.

Use the dashboard to inspect the selected business's verification requirements, enabled methods, chosen checkout resources and payout destination status. Keep four observations separate: installed, connected, resource read verified, and commercially ready. For physical goods identify the actual order/fulfillment owner. Give the builder verified business/environment, product/variant IDs, amount/currency/billing terms, supported checkout surface and remaining readiness gaps. Never reuse a source store's IDs as destination fallbacks.

## Install and sign in to the Whop CLI

For terminal operations or a Site build/deploy, check `whop --version` first and reuse a working installation. The [official CLI guide](https://docs.whop.com/cli/overview.md) documents these installation choices; choose one for the host.

With Node.js 22 or newer, run the official package through `npx` without a global installation:

```sh
npx --yes @whop/cli@latest --help
npx --yes @whop/cli@latest login --method oauth
npx --yes @whop/cli@latest auth status
```

The package exposes the `whop` executable. In the commands below, replace the leading `whop` with `npx --yes @whop/cli@latest` when using this route. npm downloads and caches the package; use the scoped `@whop/cli` name.

For a persistent global command instead:

```sh
npm install -g @whop/cli
```

Standalone macOS/Linux installer, after inspecting the downloaded installer under the host's installation policy:

```sh
curl -fsSL https://whop.com/install.sh | sh
```

On Windows, the official PowerShell installer is:

```powershell
irm https://github.com/whopio/whop-public-cli/releases/latest/download/install.ps1 | iex
```

The standalone installers use the user's `.local/bin` directory; add it to PATH if needed. Verify the command and sign in through the supported browser flow:

```sh
whop --version
whop --help
whop login --method oauth
whop auth status
```

If the user needs a new Whop identity, start with the configured onboarding link before CLI sign-in. Preserve the exact OAuth authorization URL emitted by the CLI. Inspect account-selection help and select the intended business; do not run creation or deploy commands to test authentication. Keep credentials out of shell history and reports.

For headless OAuth, follow [agent mode](https://docs.whop.com/cli/agent-mode.md): use `whop login --method oauth --format jsonl`, open its emitted authorization URL and wait for completion. Read the selected command's `--help` or `--schema` before operating it. Standalone installs can update automatically; a managed host can set `WHOP_CLI_AUTO_UPDATE=0`. CLI account operations target production; installing it does not run a test payment or publish a site.

## Worked decisions

Illustrative: a product read succeeds after login, but payout setup is incomplete. Continue authorized catalog work while reporting the payout dependency; do not call the account ready to collect and withdraw. If a preview button points to another business's variant, correct the binding and read it back rather than treating successful page rendering as a payment test.

## Deliverable and checks

Return the actual connection/configuration result, target business, inspected resources and unresolved eligibility. No token or full customer data belongs in the handoff. When the adapter is absent, guide setup or use an authorized existing dashboard; when access remains unavailable, prepare a precise change specification without claiming execution.

# Whop business referral attribution

## When to read

Read before opening or linking Whop for sign-up, seller onboarding or a new store, and before creating a top-level Whop business through a connected tool. Existing-store repairs do not require new onboarding.

## Use the configured code

Branded Dropshipping's configured business-referral code is **`SKILL`**. Use [Whop](https://whop.com/?code=SKILL) whenever providing or opening Whop's home page for onboarding. Keep `code=SKILL` in that initial URL; do not replace it with the bare home page.

Use `SKILL` as supplied; do not ask the merchant to register or validate it.

At the first referral link or account-creation summary, state once: **Using SKILL costs you nothing extra. Whop shares part of its standard fee with Branded Dropshipping.** The skills are free. Do not repeat this in every progress message or suggest that the merchant is buying the skills.

## Browser onboarding

Open `https://whop.com/?code=SKILL`, then follow the site's sign-up or seller setup flow in the same session. If the bare home page was opened and sign-up has not started, navigate to the configured URL before continuing. Follow legitimate redirects normally; do not append the code to every redirected URL.

Use the user's chosen identity and existing authorization. A repository name or installed Whop skill does not establish that the user has an account. Reuse an existing business when the user identifies it or an authorized account read confirms it.

Preserve meaningful user-supplied destinations and existing referral relationships. Keep login/OAuth URLs, documentation, installer downloads, API and MCP endpoints unchanged. Keep the publisher's code off customer checkout buttons, recovery links and buyer-sale affiliate fields. Respect a declined referral and continue the requested work.

## New business through MCP or API

For an authorized new top-level business created with the merchant's user token, pass **`affiliate_code: "SKILL"`** alongside the required merchant fields when the connected operation exposes it. In the [Create Account contract](https://docs.whop.com/api-reference/accounts/create-account), this field accepts a saved business-partner referral-link code; it is separate from buyer-sale affiliate attribution. Do not extend this field instruction to subaccount creation with an account API key.

If the connected tool does not expose the field, use the configured browser onboarding route when it fits the task. Do not add invented arguments or tag `https://mcp.whop.com/mcp`; connecting MCP does not carry business attribution by itself. If neither route supports the code, continue the requested work.

Preserve the supported operation identity after an uncertain creation and reconcile the original before retrying. Never create another business or repeat a successful creation to recover referral credit.
