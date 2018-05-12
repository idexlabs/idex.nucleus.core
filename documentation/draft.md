# Company settings

 * Implement the company settings page
   
   The company settings page is divided in cards, each card represent a different group of settings. 
   Some card will navigate the user to another page others don't.
   
   **Company profile card `profile`**  
   
   This card gives a summary of the company's profile at a glance;
   
    * Name
    * Logo
    * Full address
    * Website URL
    * Email
    * Phone number
    * Number of employee
    
   Clicking anywhere on the card or the "Edit" button will navigate the user to the "Profile" page.
   
   **Quote customization card `quote.coverImageMediaID`**
   
   This card is mostly a overgrown link to the "Quote customization" page.  
   Ideally it would show a random portfolio image from the company but could also just use a generic "roofing" image.
   
   Clicking anywhere on the card or the "Edit" button will navigate the user to the "Quote customization" page.
   
   **Job customization card `job.coverImageMediaID`**
  
   This card is mostly a overgrown link to the "Job customization" page.  
   Ideally it would show a random portfolio image from the company but could also just use a generic "roofing" image.
  
   Clicking anywhere on the card or the "Edit" button will navigate the user to the "Job customization" page.

   **Localization `localization`**

   This card allows the user to change every localization values:
   
    * Language
    * Timezone
    * Data format
    * Time format
    * Length unit
    * Area unit
    
   **Enabled languages `localization.enabledLanguageISOList`**
   
   This card allows the user to enable/disable languages at a glance.
   
   **Membership `package.summary`**
   
   This card shows the company's current membership selection with a summary.
   
   Clicking anywhere on the card or the "Upgrade" button will navigate the user to the "Membership" page.
   
   **Billing `billing.summary`**
   
   This card shows the company's billing address and default credit card summary.  
   
   Clicking on the billing address, credit card or "Edit" button will navigate the user to the "Billing" page.  
   Clicking on the "View history" button will navigate the user to the "Billing history" page.
   

## Profile

`GET /companies/:companyId` Retrieve the company profile.
`GET /companies/:companyId/settings?group=profile` Retrieve the company profile.
`GET /companies/:companyId/settings?group=profile.name` Retrieve the company name.

## Membership

`GET /companies/:companyId/settings?group=package.Id` Retrieve the package linked to this company.
`GET /companies/:companyId/packages` Retrieve the available packages to this company.

## Billing

`GET /companies/:companyId/settings?group=billing` Retrieve the billing settings for this company.
`GET /companies/:companyId/settings?group=billing.address` Retrieve the billing address for this company.
`POST /companies/:companyId/settings?group=billing.creditCard` Add a credit card for this company.
`PATH /companies/:companyId/creditCard/:creditCardId` Modify a credit card.

### Billing history

### Add credit card

## Quote customization

### Email

## Job customization

### Terms & Conditions

# User preferences

## Profile

## Password

# User management

## Search

## Invite

## User details

### Edit

### Remove

### Reset password

### Reinvite


## Package

## Widget/Feature

## Permission management