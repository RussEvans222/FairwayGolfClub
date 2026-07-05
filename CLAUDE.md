# Fairway Golf Club — Project Dev Notes

## What This Project Is

Fairway Golf Club is a premium AI-powered indoor golf improvement club concept being built in Northern Virginia. This repo contains:

1. **`fairway-website/`** — Static HTML/CSS site hosted on Cloudflare Pages, connected to GitHub (auto-deploys on push to `main`)
2. **`fairway-sf/`** — Salesforce DX project targeting a STORM demo org, used for Experience Cloud, LWC components, and CRM configuration

---

## Key Credentials & IDs

| Item | Value |
|---|---|
| Live site | `https://fairwaygolfclub.co` |
| GitHub repo | `RussEvans222/FairwayGolfClub` |
| Salesforce Org ID | `00Dak000011rATC` |
| Salesforce username | `storm.bd727290084d27@salesforce.com` |
| SF CLI alias | `FairwayGolfClub` |
| Experience Site API name | `Fairway_Golf_Club1` (picassoSite) |
| reCAPTCHA site key | `6LeXE0YtAAAAABNLw7oPp_gT8umYKYmEuxSKHMC3` |

---

## Static Website (`fairway-website/`)

### Pages
| Path | Purpose |
|---|---|
| `index.html` | Coming-soon homepage with email capture form |
| `investors-portal/index.html` | Founding investor pitch + interest form |
| `thanks/index.html` | Post-form submission confirmation page |

### Images
All 12 site images live in `fairway-website/images/` — Gemini-generated, gold/dark theme. Same set is in `fairway-sf/force-app/main/default/staticresources/fgcImages/` (compressed to ~1.7MB for Salesforce deployment).

### Forms — Web-to-Lead
Both forms POST directly to Salesforce Web-to-Lead. **Do not add `e.preventDefault()` or `fetch()` intercepts** — the forms must do a native browser POST and redirect to `/thanks/`.

**Homepage form** (`index.html`):
- Captures email only
- Hidden fields: `last_name=Unknown`, `company=Individual`, `Interest_Type__c=General Interest`
- retURL: `https://fairwaygolfclub.co/thanks/`

**Investor portal form** (`investors-portal/index.html`):
- Captures: first name, last name, email, phone, interest type, investment amount, description
- Interest Type field ID: `00Nak00004DAbhV`
- Investment Interest field ID: `00Nak00004DAbhW`
- Investment Amount field only appears when "Founding Investor" is selected (JS `toggleInvestment()`)
- retURL: `https://fairwaygolfclub.co/thanks/`

### reCAPTCHA
- Both forms use reCAPTCHA v2 ("I'm not a robot")
- The `<div class="g-recaptcha">` widget **must be inside the `<form>` tag** or Salesforce rejects the submission silently
- The `timestamp()` script and `captcha_settings` hidden field are required by Salesforce's reCAPTCHA integration

### Deployment
Push to `main` → Cloudflare Pages auto-deploys. No build command needed — it's a pure static site. **Do not set a deploy command** in Cloudflare (it's a Pages project, not a Worker).

---

## Salesforce Project (`fairway-sf/`)

### Authenticate
```bash
sf org login web --alias FairwayGolfClub
sf config set target-org FairwayGolfClub
```

### Project Structure
```
force-app/main/default/
  lwc/                        # 6 Experience Cloud components
  staticresources/fgcImages/  # Compressed site images (9 JPEGs, ~1.7MB)
  objects/Lead/
    fields/                   # 2 custom fields
    listViews/                 # Investor leads list view
  permissionsets/             # Fairway_Admin permission set
  networks/                   # Experience Site network metadata
```

### Custom Lead Fields
| Label | API Name | Type | Purpose |
|---|---|---|---|
| Interest Type | `Interest_Type__c` | Picklist | Founding Investor / Future Member / General Interest |
| Investment Interest | `Investment_Interest__c` | Currency | Dollar amount selected on investor form |

**FLS note:** Both fields need the `Fairway_Admin` permission set assigned to be editable. If fields are read-only on a Lead record, run:
```bash
sf org assign permset --name Fairway_Admin --target-org FairwayGolfClub
```

### LWC Components
All 6 components are deployed to the org and exposed for Experience Cloud (`lightningCommunity__Page`). They mirror the static HTML site design — same gold/dark theme, same sections.

| Component | Purpose | Notes |
|---|---|---|
| `fgcHero` | Full-bleed hero, email signup | Posts to Formspree as fallback (Experience Cloud context) |
| `fgcPhotoStrip` | 3-column image strip | Pulls from `fgcImages` static resource |
| `fgcFeatures` | 6-card features grid | Data hardcoded in JS |
| `fgcShowcase` | Reusable image+text section | Has `@api` props: `eyebrow`, `heading`, `body`, `imageFile`, `reverse` — configure in Experience Builder |
| `fgcGallery` | 4-image bottom gallery | Pulls from `fgcImages` static resource |
| `fgcFooter` | Footer with brand + investor link | Static |

**Drop order in Experience Builder (top to bottom):**
1. `fgcHero`
2. `fgcPhotoStrip`
3. `fgcFeatures`
4. `fgcShowcase` — eyebrow: "AI-Powered Experience", imageFile: `ai-checkin.png`, reverse: false
5. `fgcShowcase` — eyebrow: "Social & Competitive", imageFile: `bays-social.png`, reverse: true
6. `fgcGallery`
7. `fgcFooter`

**Theme settings (Experience Builder → Branding):**
- Brand Color: `#C9A84C`
- Background: `#0A0A0A`
- Text: `#FFFFFF`
- Column padding: 0px on all sides, no max width

### Static Resource
Images are in `force-app/main/default/staticresources/fgcImages/` as a folder static resource (contentType: `application/zip`). Original full-size PNGs are in `fairway-website/images/` — the SF versions were compressed with `sips` to stay under the 52MB Metadata API limit.

### List Views
`Lead.Fairway_Investor_Leads` — filters for leads where `Investment_Interest__c >= 1`. Visible to all users in the Sales app Leads tab.

### Deploy Commands
```bash
# Deploy everything
sf project deploy start --source-dir force-app/main/default --target-org FairwayGolfClub

# Deploy specific areas
sf project deploy start --source-dir force-app/main/default/lwc --target-org FairwayGolfClub
sf project deploy start --source-dir force-app/main/default/objects --target-org FairwayGolfClub
sf project deploy start --source-dir force-app/main/default/staticresources --target-org FairwayGolfClub
```

---

## Pending / Next Steps

- [ ] **Cloudflare Stream** — Upload `Fairway_Golf_Club_-_The_Member-to-Investor_Tour.mp4` to Cloudflare Stream, get embed URL, wire into `investors-portal/index.html` video placeholder section
- [ ] **Experience Builder** — Wire the 6 LWC components into the Fairway Golf Club Experience Site pages
- [ ] **Lead assignment rule** — Auto-assign incoming web leads to Russell + trigger email alert
- [ ] **Web-to-Lead on homepage** — Consider adding first/last name fields so leads don't come in as "Unknown"
- [ ] **Images** — Further image improvements flagged as in-progress

---

## What NOT to Do

- Do not add `e.preventDefault()` or `fetch()` to form submit handlers — breaks Web-to-Lead
- Do not put reCAPTCHA widget outside the `<form>` tag — Salesforce silently rejects the submission
- Do not deploy the full-size PNGs from `fairway-website/images/` to Salesforce — they are 83MB uncompressed and will hit the 52MB API limit
- Do not set a deploy command in Cloudflare — this is a Pages project, not a Worker
- Do not reference Workhouse Arts Center or Lorton as the location anywhere public-facing — location is not yet announced
- Do not reference Russell keeping his day job anywhere public-facing
