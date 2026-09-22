import { generateArchetype } from './src/lib/archie-engine'

const dates = [
  '1990-07-15', '1993-05-19', '1985-06-20', '1995-08-08',
  '1994-08-03', '2000-07-15', '1990-10-10', '1988-10-08',
  '1983-09-25', '2001-12-31'
]

for (const date of dates) {
  const result = generateArchetype({ birthDate: date })
  const name = result.name
  const ok = !name.includes('undefined')
  console.log(`${ok ? '✅' : '❌'} ${date} → ${name}`)
}
