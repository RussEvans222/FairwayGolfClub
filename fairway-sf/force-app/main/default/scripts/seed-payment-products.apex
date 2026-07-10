// Seed the Products + Standard Pricebook entries the kiosk's revenue tracking
// depends on. Product/PricebookEntry are data, not metadata — can't be deployed
// via `sf project deploy`, so this has to be run once with `sf apex run`.
// Safe to re-run — skips creation if a product/entry already exists.
//
// Prices here are placeholders — edit the PricebookEntry.UnitPrice values in
// Setup (or re-run with different amounts below) whenever the real rate is
// decided. Nothing in the kiosk or Apex code hardcodes these numbers; they're
// looked up live by product name every time a charge is created.

Id standardPbId = [SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1].Id;

Map<String, Decimal> productsAndRates = new Map<String, Decimal>{
    'Walk-In Session Fee' => 35.00,
    '30-Minute Extension'  => 17.50
};

for (String productName : productsAndRates.keySet()) {
    Decimal rate = productsAndRates.get(productName);

    List<Product2> existing = [SELECT Id FROM Product2 WHERE Name = :productName LIMIT 1];
    Product2 prod;
    if (existing.isEmpty()) {
        prod = new Product2(Name = productName, IsActive = true, Family = 'Bay Session');
        insert prod;
        System.debug('Created Product2: ' + productName + ' (' + prod.Id + ')');
    } else {
        prod = existing[0];
        System.debug('Reusing Product2: ' + productName + ' (' + prod.Id + ')');
    }

    List<PricebookEntry> existingEntry = [
        SELECT Id, UnitPrice FROM PricebookEntry
        WHERE Product2Id = :prod.Id AND Pricebook2Id = :standardPbId
        LIMIT 1
    ];
    if (existingEntry.isEmpty()) {
        insert new PricebookEntry(
            Product2Id   = prod.Id,
            Pricebook2Id = standardPbId,
            UnitPrice    = rate,
            IsActive     = true
        );
        System.debug('Created PricebookEntry for ' + productName + ' at $' + rate);
    } else {
        System.debug('PricebookEntry already exists for ' + productName + ' at $' + existingEntry[0].UnitPrice);
    }
}

System.debug('✅ Payment products seeded. Verify rates in Setup → Products / Price Books before relying on real revenue numbers.');
