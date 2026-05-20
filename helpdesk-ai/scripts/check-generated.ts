import { readFile } from 'fs/promises';
async function main() {
  const raw = await readFile('./data/generated-100.json', 'utf-8');
  const entries = JSON.parse(raw);
  let l1 = 0, l2 = 0, l2r = 0, l2null = 0;
  for (const e of entries) {
    if (e.resolution_type === 'l1_resolved') l1++;
    else if (e.resolution_type === 'l2_resolved') l2++;
    else if (e.resolution_type === 'l2_rejected_then_resolved') l2r++;
    if (e.resolution_type !== 'l1_resolved' && !e.agent_l2) l2null++;
  }
  console.log(`총: ${entries.length}, l1_resolved: ${l1}, l2_resolved: ${l2}, l2_rejected: ${l2r}`);
  console.log(`l2인데 agent_l2가 null: ${l2null}`);
}
main();
