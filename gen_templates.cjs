const fs = require('fs');
const path = require('path');

const dir = 'meme _templates';
if (!fs.existsSync(dir)) {
  console.error('Directory meme _templates not found!');
  process.exit(1);
}

const files = fs.readdirSync(dir).filter(f => !f.startsWith('.'));

function getCleanName(filename) {
  let name = filename.replace(/\.(jpg|jpeg|png|gif)$/i, '');
  name = name.replace(/^["'_`]+|["'_`]+$/g, '');
  
  if (name.includes('Unsheathing the Sword')) return 'Unsheathing the Sword';
  if (name.includes('Slavery With Extra Steps')) return 'Slavery With Extra Steps';
  if (name.includes('When X vs When X')) return 'Blep Cat';
  if (name.includes('Parents Ask Where All Your Money Went')) return 'Where All Money Went';
  if (name.includes('Will smith slap')) return 'Will Smith Slap';
  if (name.includes('Winnie the pooh')) return 'Winnie The Pooh Teeth';
  if (name.includes('Woman Scared of Breasts')) return 'Woman Scared of Breasts';
  if (name.includes('Woman Yelling At A Cat')) return 'Woman Yelling At A Cat';
  if (name.includes('Wooo')) return 'Dexter Good Burger';
  if (name.includes('Write That Down')) return 'Write That Down!';
  if (name.includes('Wumbo')) return 'Grab Em By The Wumbo';
  if (name.includes('X Is Good But X Is Better')) return 'X Is Good But X Is Better';
  if (name.includes('Yes Chads Kissing')) return 'Chads Kissing';
  if (name.includes('You Guys Are Getting Paid') && name.includes('Full')) return 'You Guys Are Getting Paid (Full)';
  if (name.includes('You Guys Are Getting Paid')) return 'You Guys Are Getting Paid';
  if (name.includes('You Took Everything From Me')) return 'You Took Everything From Me';
  if (name.includes('You_re Weak') || name.includes('Youre Weak')) return 'Youre Weak Im You';
  if (name.includes('Keep Your Secrets')) return 'Keep Your Secrets';
  if (name.includes('stray further from god')) return 'Everyday We Stray Further';
  if (name.includes('Finally! A Worthy Opponent') || name.includes('Worthy Opponent')) return 'A Worthy Opponent!';
  if (name.includes('Good Question')) return 'Good Question';
  if (name.includes('Only in my memory')) return 'He Exists Now In Memory';
  if (name.includes('I Serve the Soviet Union')) return 'I Serve The Soviet Union';
  if (name.includes('find you and I will kill you')) return 'I Will Find You';
  if (name.includes('Seen Enough')) return 'I Have Seen Enough';
  if (name.includes('Learn This Power')) return 'Is It Possible To Learn This Power';
  if (name.includes('Surprise Tool')) return 'Its A Surprise Tool';
  if (name.includes('I_m a sign, not a cop') || name.includes('Im a sign')) return 'Im A Sign Not A Cop';
  if (name.includes('Point')) return 'Hes Got A Point';
  if (name.includes('Parkour')) return 'Parkour!';
  if (name.includes('Tell Me The Truth')) return 'Tell Me The Truth Im Ready';
  if (name.includes('virgin crying boy')) return 'Virgin Crying Boy vs Chad';

  return name;
}

const templates = files.map((f, i) => {
  const cleanName = getCleanName(f);
  const id = 'folder-tpl-' + (i + 1);
  const url = '/meme_templates/' + encodeURIComponent(f);
  return { id, name: cleanName, url };
});

const fileContent = `import { MemeTemplate } from '../types';

export const CLASSIC_MEME_TEMPLATES: MemeTemplate[] = ${JSON.stringify(templates, null, 2)};
`;

fs.writeFileSync('src/data/templates.ts', fileContent, 'utf-8');
console.log(`Generated src/data/templates.ts with ${templates.length} templates from meme _templates.`);
