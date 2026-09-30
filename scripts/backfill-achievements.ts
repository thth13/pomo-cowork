import { prisma } from '../lib/db'
import { runAchievementJobs } from '../lib/achievements/jobs'

async function main() {
  await prisma.$executeRaw`INSERT INTO "achievement_state" ("userId") SELECT "id" FROM "users" WHERE NOT "isAnonymous"
    ON CONFLICT ("userId") DO UPDATE SET "version" = "achievement_state"."version" + 1`
  let more = true, count = 0
  while (more) {
    const result = await runAchievementJobs(100)
    count += result.evaluated
    more = result.hasMore
    console.log(`Evaluated ${count} profiles.`)
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
