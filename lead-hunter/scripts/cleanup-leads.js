import Database from 'better-sqlite3';

const db = new Database('./data/leads.db');

// Contar leads antes
const counts = db.prepare('SELECT lead_type, COUNT(*) as n FROM leads GROUP BY lead_type').all();
console.log('Leads antes de limpiar:', counts);

// Patrones de posts que son OFERTAS de servicios (competidores)
const offerLeads = db.prepare(`
  SELECT id, name, sector FROM leads
  WHERE lead_type = 'online'
  AND (
    name LIKE '%[Offer]%' OR name LIKE '%[OFFER]%' OR name LIKE '%[O]%'
    OR name LIKE '%hire me%' OR name LIKE '%I will build%'
    OR name LIKE '%I can build%' OR name LIKE '%my services%'
    OR name LIKE '%available for work%' OR name LIKE '%looking for work%'
  )
`).all();

console.log(`\nLeads de OFERTA (competidores, no clientes): ${offerLeads.length}`);
offerLeads.forEach(l => console.log(`  [${l.id}] ${l.sector} | ${l.name.slice(0, 80)}`));

// Borrar ofertas
const delOffers = db.prepare(`
  DELETE FROM leads WHERE id IN (${offerLeads.map(l => l.id).join(',') || 0})
`);
if (offerLeads.length > 0) {
  delOffers.run();
  console.log(`  → Eliminados ${offerLeads.length} leads de oferta`);
}

// Resetear scores de leads online para re-scoring
const resetResult = db.prepare(`
  UPDATE leads SET lead_score = 0, lead_tier = 'cold', notes = NULL
  WHERE lead_type = 'online'
`).run();
console.log(`\nScores reseteados: ${resetResult.changes} leads online (se re-calcularán)`);

// Contar después
const after = db.prepare('SELECT lead_type, COUNT(*) as n FROM leads GROUP BY lead_type').all();
console.log('\nLeads después de limpiar:', after);

db.close();
