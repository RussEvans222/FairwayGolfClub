// Seed the Products + Pricebooks the kiosk's revenue tracking depends on.
// Product/Pricebook2/PricebookEntry are data, not metadata — can't be deployed
// via `sf project deploy`, so this has to be run once with `sf apex run`.
// Safe to re-run — skips creation if a product/pricebook/entry already exists.
//
// Tiered pricing: two Pricebooks share the same two Products, priced
// differently per book. The kiosk picks Standard (walk-in) vs Member Pricing
// per golfer based on whether they have an Active/Complimentary Membership__c
// record — see resolvePricebookId() in App.tsx. Adding more tiers later (e.g.
// Bronze/Silver/Gold) just means another Pricebook2 + two more PricebookEntry
// rows; nothing in the kiosk or Apex code needs to change.
//
// Rates below are current as of 2026-07-10 (Russell): member session $35,
// walk-in/non-member session $45 (premium — no membership required), and an
// unplanned extension is priced higher than half the base rate on purpose —
// $17.50 + 25% of that tier's base session rate:
//   member:  17.50 + 0.25 * 35 = $26.25
//   walk-in: 17.50 + 0.25 * 45 = $28.75
// Edit the numbers below and re-run to change rates — nothing else in the
// codebase hardcodes them.

// Anonymous Apex wraps this whole script in an implicit outer method, which
// makes any class defined here a nested (not top-level) type — and Apex
// disallows static methods on nested types. Instance methods + an explicit
// `new` at the bottom sidestep that.
public class FairwayPaymentSeed {
    public void run() {
        Id standardPbId = [SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1].Id;

        List<Pricebook2> memberPbs = [SELECT Id FROM Pricebook2 WHERE Name = 'Member Pricing' LIMIT 1];
        Id memberPbId;
        if (memberPbs.isEmpty()) {
            Pricebook2 pb = new Pricebook2(
                Name        = 'Member Pricing',
                IsActive    = true,
                Description = 'Session rates for golfers with an Active or Complimentary Membership__c record.'
            );
            insert pb;
            memberPbId = pb.Id;
            System.debug('Created Pricebook2: Member Pricing (' + memberPbId + ')');
        } else {
            memberPbId = memberPbs[0].Id;
            System.debug('Reusing Pricebook2: Member Pricing (' + memberPbId + ')');
        }

        // productName -> { standardRate, memberRate }
        Map<String, List<Decimal>> rates = new Map<String, List<Decimal>>{
            'Bay Session'          => new List<Decimal>{ 45.00, 35.00 },
            '30-Minute Extension'  => new List<Decimal>{ 28.75, 26.25 }
        };

        for (String productName : rates.keySet()) {
            Decimal standardRate = rates.get(productName)[0];
            Decimal memberRate   = rates.get(productName)[1];

            List<Product2> existingProd = [SELECT Id FROM Product2 WHERE Name = :productName LIMIT 1];
            Product2 prod;
            if (existingProd.isEmpty()) {
                prod = new Product2(Name = productName, IsActive = true, Family = 'Bay Session');
                insert prod;
                System.debug('Created Product2: ' + productName + ' (' + prod.Id + ')');
            } else {
                prod = existingProd[0];
                System.debug('Reusing Product2: ' + productName + ' (' + prod.Id + ')');
            }

            upsertEntry(prod.Id, standardPbId, standardRate, productName + ' — walk-in');
            upsertEntry(prod.Id, memberPbId, memberRate, productName + ' — member');
        }

        System.debug('✅ Payment products + tiered pricing seeded. Verify rates in Setup → Products / Price Books before relying on real revenue numbers.');
    }

    private void upsertEntry(Id prodId, Id pbId, Decimal rate, String label) {
        List<PricebookEntry> existing = [
            SELECT Id, UnitPrice FROM PricebookEntry
            WHERE Product2Id = :prodId AND Pricebook2Id = :pbId
            LIMIT 1
        ];
        if (existing.isEmpty()) {
            insert new PricebookEntry(
                Product2Id   = prodId,
                Pricebook2Id = pbId,
                UnitPrice    = rate,
                IsActive     = true
            );
            System.debug('Created PricebookEntry for ' + label + ' at $' + rate);
        } else if (existing[0].UnitPrice != rate) {
            System.debug('PricebookEntry for ' + label + ' exists at $' + existing[0].UnitPrice
                + ' — script has $' + rate + '. Not overwriting; update manually in Setup if the rate really changed.');
        } else {
            System.debug('PricebookEntry already exists for ' + label + ' at $' + rate);
        }
    }
}

new FairwayPaymentSeed().run();
