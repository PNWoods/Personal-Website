-- Sample knowledge base for testing retrieval. Run in the Supabase SQL editor.
-- Creates a shared collection owned by the user with the given email and one
-- "note" document in it (status pending -> ingest it from the app).
-- Content is a general-knowledge sample about Oracle Utilities C2M/CC&B tables,
-- NOT verified against a real installation. Replace with real docs later.

with me as (
  select id from auth.users where email = 'woods.patrick@icloud.com'
),
c as (
  insert into public.collections (user_id, name, description, is_shared)
  select id, 'C2M schema primer', 'Sample notes on Oracle Utilities C2M / CC&B core tables (unverified)', true
  from me
  returning id, user_id
)
insert into public.documents (collection_id, user_id, title, source_type, status, content)
select c.id, c.user_id, 'C2M core tables (sample)', 'note', 'pending', $doc$
# Oracle Utilities C2M / CC&B core tables (sample, unverified)

This is a working primer on where information lives in a Customer to Meter (C2M) / Customer Care and Billing (CC&B) database. Table names use the CI_ prefix for customer-side objects, D1_ for the meter data management (MDM) side, and F1_ for the Oracle Utilities Application Framework (OUAF).

## Person and account

### CI_PER
The person table. One row per person or business the utility deals with. Key column PER_ID (char 10). Holds language (LANGUAGE_CD), life support / sensitive load flags, and receives-notification settings. Names are in CI_PER_NAME (PER_ID, SEQ_NUM, ENTITY_NAME, NAME_TYPE_FLG) and phone numbers in CI_PER_PHONE. Identifiers such as driver's license or SSN live in CI_PER_ID (ID_TYPE_CD, PER_ID_NBR).

### CI_ACCT
The account table. An account is the unit that gets billed. Key column ACCT_ID (char 10). Important columns: SETUP_DT (when the account was created), CURRENCY_CD, BILL_CYC_CD (bill cycle), CUST_CL_CD (customer class, drives collections and billing rules), ACCT_MGMT_GRP_CD, CIS_DIVISION.

### CI_ACCT_PER
Links persons to accounts (many to many). Columns ACCT_ID, PER_ID, MAIN_CUST_SW (main customer switch), ACCT_REL_TYPE_CD (relationship type such as MAIN or SPOUSE), BILL_ADDR_SRCE_FLG (where bills are sent), RECEIVE_COPY_SW. To find who is financially responsible for an account, look here with MAIN_CUST_SW = 'Y'.

## Service agreements and premises

### CI_SA
Service agreement: a contract for one service (electric, water, gas, charges) on an account. Key column SA_ID. Columns ACCT_ID, SA_TYPE_CD, SA_STATUS_FLG (10 pending start, 20 active, 30 pending stop, 40 stopped, 50 reactivated, 60 closed, 70 cancelled), START_DT, END_DT, CIS_DIVISION, SA_REL_ID for sub-SA relationships. Billing runs at the SA level and rolls up to the account.

### CI_PREM
Premise: a physical location, usually an address. Key column PREM_ID. Columns ADDRESS1..4, CITY, POSTAL, COUNTY, GEO_CD, PREM_TYPE_CD, and MAIL_ADDR_SW. Characteristics (like meter reading instructions) are in CI_PREM_CHAR.

### CI_SP
Service point: the point where service is delivered at a premise. Key column SP_ID. Columns PREM_ID, SP_TYPE_CD, SP_STATUS_FLG, INSTALL_DT, SP_SRC_STATUS_FLG (connected / disconnected). One premise can have many service points (electric and water for example).

### CI_SA_SP
Links service agreements to service points, with START_DT, STOP_DT and USE_PCT (percentage of the service point's consumption billed to this SA). This is how you get from a customer's contract to the meter that measures it.

## Meters and readings (CC&B classic)

### CI_MTR and CI_MTR_CONFIG
CI_MTR is the meter (MTR_ID, MTR_TYPE_CD, BADGE_NBR, SERIAL_NBR). CI_MTR_CONFIG defines the registers on a meter (MTR_CONFIG_ID, EFF_DTTM). Registers are in CI_REG (REGISTER_ID, MTR_CONFIG_ID, UOM_CD, TOU_CD, CONS_SUB_FLG, REG_CONST).

### CI_SP_MTR_HIST
Which meter is installed at which service point and when: SP_ID, MTR_CONFIG_ID, INSTALL_DTTM, REMOVE_DTTM.

### CI_MR and CI_REG_READ
CI_MR is a meter read header (MR_ID, MTR_CONFIG_ID, READ_DTTM, MR_SOURCE_CD, USE_ON_BILL_SW). CI_REG_READ holds the register-level values (REG_READING, READ_TYPE_FLG). In a C2M installation most interval and register data lives on the MDM side instead (see D1_ tables).

## Billing and financials

### CI_BILL and CI_BSEG
CI_BILL is the bill header (BILL_ID, ACCT_ID, BILL_DT, BILL_STAT_FLG, COMPLETE_DTTM, DUE_DT). CI_BSEG is the bill segment, one per SA on the bill (BSEG_ID, BILL_ID, SA_ID, START_DT, END_DT, BSEG_STAT_FLG). Bill segment calculation lines are in CI_BSEG_CALC and CI_BSEG_CALC_LN (rate component detail); consumption used is in CI_BSEG_SQ (service quantities).

### CI_FT
Financial transaction: every debit or credit to an SA. Key FT_ID. Columns SA_ID, FT_TYPE_FLG (BS bill segment, BX bill segment cancel, AD adjustment, AX adjustment cancel, PS pay segment, PX pay segment cancel), CUR_AMT (current amount), TOT_AMT, ARS_DT (arrears date), FREEZE_DTTM, FREEZE_SW, SIBLING_ID (the bill segment, adjustment or pay segment it came from). An account's balance is the sum of CUR_AMT over frozen FTs across its SAs.

### CI_ADJ
Adjustments (ADJ_ID, SA_ID, ADJ_TYPE_CD, ADJ_AMT, ADJ_STATUS_FLG, CRE_DT). Adjustment types define the distribution code and whether it is a credit or debit.

### CI_PAY and CI_PAY_SEG
CI_PAY_EVENT is the payment event (money received, PAY_EVENT_ID, PAY_DT). CI_PAY is the payment against an account (PAY_ID, PAY_EVENT_ID, ACCT_ID, PAY_AMT, PAY_STATUS_FLG). CI_PAY_SEG distributes a payment to SAs (PAY_SEG_ID, PAY_ID, SA_ID, PAY_SEG_AMT). Tender detail is in CI_PAY_TNDR.

## Cases, to-dos and operational data

### CI_CASE
Case management (CASE_ID, CASE_TYPE_CD, PER_ID, ACCT_ID, PREM_ID, CASE_STATUS). Case logs in CI_CASE_LOG.

### CI_TD_ENTRY
To Do entries, the work queue (TD_ENTRY_ID, TD_TYPE_CD, ROLE_ID, ENTRY_STATUS_FLG, CRE_DTTM, ASSIGNED_USER_ID). Drill keys in CI_TD_DRLKEY link an entry to the object it is about, and messages come from CI_TD_ENTRY_MSG.

### CI_FA
Field activities (FA_ID, SP_ID, FA_TYPE_CD, FA_STATUS_FLG, SCHED_DTTM) in classic CC&B; in C2M most field work is service orders and activities on the D1_ side.

## MDM / C2M side (D1_)

### D1_SP and D1_DVC
D1_SP is the MDM service point (D1_SP_ID, SP_TYPE_CD, external ID linking to CI_SP via D1_SP_IDENTIFIER). D1_DVC is the device (meter) with D1_DVC_CFG as its configuration and D1_MC (measuring component) as the register/channel that measurements attach to.

### D1_MSRMT and D1_INIT_MSRMT_DATA
D1_MSRMT holds final measurements (MEASR_COMP_ID, MSRMT_DTTM, MSRMT_VAL, MSRMT_COND_FLG). Initial measurement data (raw reads before VEE) is in D1_INIT_MSRMT_DATA. Usage transactions that feed billing are in D1_USAGE and D1_USAGE_PERIOD.

## Framework (F1_)

### F1_BUS_OBJ, F1_ALG and F1_BATCH_JOB
F1_BUS_OBJ defines business objects, F1_ALG algorithms and F1_ALG_TYPE algorithm types. Batch control is in F1_BATCH_CTRL and job runs in F1_BATCH_JOB / F1_BATCH_RUN. Characteristic types are in F1_CHAR_TYPE. Lookups (the flag values used throughout, like SA_STATUS_FLG) are in CI_LOOKUP_FIELD / CI_LOOKUP_VAL.

## Where to look for common questions

- Who is the customer on an account: CI_ACCT_PER (MAIN_CUST_SW = 'Y') joined to CI_PER and CI_PER_NAME.
- What services does a customer have: CI_ACCT -> CI_SA (active statuses 20 and 50) -> CI_SA_SP -> CI_SP -> CI_PREM.
- Which meter is at an address: CI_PREM -> CI_SP -> CI_SP_MTR_HIST (REMOVE_DTTM null) -> CI_MTR_CONFIG -> CI_MTR.
- What does a customer owe: sum CI_FT.CUR_AMT where FREEZE_SW = 'Y' for the account's SAs; aging uses ARS_DT.
- Why was a bill this amount: CI_BILL -> CI_BSEG -> CI_BSEG_CALC_LN (rate detail) and CI_BSEG_SQ (quantities).
- Open work items: CI_TD_ENTRY where ENTRY_STATUS_FLG = 'O'.
$doc$
from c
returning id;
