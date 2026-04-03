require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'cloudlibrary',
  user: process.env.DB_USER || 'cloudlib_user',
  password: process.env.DB_PASSWORD,
});

const BOOKS = [
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    description: "A classic novel of manners following the Bennet family's five daughters as they navigate love, marriage, and society in early 19th-century England. The witty and independent Elizabeth Bennet clashes with the proud Mr. Darcy in one of literature's most beloved romances.",
    genre: "Romance",
    language: "English",
    year: 1813,
    pages: 432,
    cover_gradient: "linear-gradient(135deg, #1a237e, #3b82f6)",
    gutenberg_id: 1342,
    gutenberg_url: "https://www.gutenberg.org/ebooks/1342"
  },
  {
    title: "Frankenstein",
    author: "Mary Shelley",
    description: "A young scientist creates a sapient creature in an unorthodox scientific experiment. Often considered the first true science fiction novel, it explores themes of creation, responsibility, and what it means to be human.",
    genre: "Horror",
    language: "English",
    year: 1818,
    pages: 280,
    cover_gradient: "linear-gradient(135deg, #1b0000, #7f1d1d)",
    gutenberg_id: 84,
    gutenberg_url: "https://www.gutenberg.org/ebooks/84"
  },
  {
    title: "Moby Dick",
    author: "Herman Melville",
    description: "The epic tale of Captain Ahab's obsessive quest to hunt the white sperm whale that destroyed his ship and took his leg. A monumental work about obsession, fate, and man's struggle against nature.",
    genre: "Adventure",
    language: "English",
    year: 1851,
    pages: 635,
    cover_gradient: "linear-gradient(135deg, #0c4a6e, #0ea5e9)",
    gutenberg_id: 2701,
    gutenberg_url: "https://www.gutenberg.org/ebooks/2701"
  },
  {
    title: "Adventures of Huckleberry Finn",
    author: "Mark Twain",
    description: "Often considered the Great American Novel, it follows the adventures of a boy named Huck Finn as he travels down the Mississippi River on a raft with a runaway slave named Jim.",
    genre: "Adventure",
    language: "English",
    year: 1884,
    pages: 366,
    cover_gradient: "linear-gradient(135deg, #78350f, #d97706)",
    gutenberg_id: 76,
    gutenberg_url: "https://www.gutenberg.org/ebooks/76"
  },
  {
    title: "Alice's Adventures in Wonderland",
    author: "Lewis Carroll",
    description: "A young girl named Alice falls through a rabbit hole into a fantasy world populated by peculiar creatures. A beloved classic of children's literature with deep philosophical undertones.",
    genre: "Fantasy",
    language: "English",
    year: 1865,
    pages: 182,
    cover_gradient: "linear-gradient(135deg, #4c1d95, #8b5cf6)",
    gutenberg_id: 11,
    gutenberg_url: "https://www.gutenberg.org/ebooks/11"
  },
  {
    title: "Dracula",
    author: "Bram Stoker",
    description: "The definitive vampire novel. Told through diary entries and letters, it follows Count Dracula's attempt to move from Transylvania to England, and the battle between Dracula and a small group led by Professor Abraham Van Helsing.",
    genre: "Horror",
    language: "English",
    year: 1897,
    pages: 418,
    cover_gradient: "linear-gradient(135deg, #1c0505, #991b1b)",
    gutenberg_id: 345,
    gutenberg_url: "https://www.gutenberg.org/ebooks/345"
  },
  {
    title: "The Picture of Dorian Gray",
    author: "Oscar Wilde",
    description: "A philosophical novel about a handsome young man who sells his soul for eternal youth while a portrait of him ages and reflects his moral corruption. A masterwork of Gothic literature.",
    genre: "Classic",
    language: "English",
    year: 1890,
    pages: 254,
    cover_gradient: "linear-gradient(135deg, #1e1b4b, #7c3aed)",
    gutenberg_id: 174,
    gutenberg_url: "https://www.gutenberg.org/ebooks/174"
  },
  {
    title: "Crime and Punishment",
    author: "Fyodor Dostoevsky",
    description: "A psychological thriller that follows the mental anguish and moral dilemmas of Rodion Raskolnikov, an impoverished ex-student who formulates and executes a plan to kill a pawnbroker for her money.",
    genre: "Classic",
    language: "English",
    year: 1866,
    pages: 551,
    cover_gradient: "linear-gradient(135deg, #1c1917, #78716c)",
    gutenberg_id: 2554,
    gutenberg_url: "https://www.gutenberg.org/ebooks/2554"
  },
  {
    title: "The Odyssey",
    author: "Homer",
    description: "One of the oldest works of Western literature, the epic poem follows Odysseus's ten-year journey home after the fall of Troy, encountering mythical creatures, divine interventions, and testing his wit and resilience.",
    genre: "Poetry",
    language: "English",
    year: -800,
    pages: 374,
    cover_gradient: "linear-gradient(135deg, #713f12, #ca8a04)",
    gutenberg_id: 1727,
    gutenberg_url: "https://www.gutenberg.org/ebooks/1727"
  },
  {
    title: "Hamlet",
    author: "William Shakespeare",
    description: "Prince Hamlet is visited by his father's ghost, who reveals he was murdered by Hamlet's uncle, who has now married Hamlet's mother and taken the throne. A profound exploration of revenge, mortality, and madness.",
    genre: "Drama",
    language: "English",
    year: 1603,
    pages: 196,
    cover_gradient: "linear-gradient(135deg, #0f172a, #334155)",
    gutenberg_id: 1524,
    gutenberg_url: "https://www.gutenberg.org/ebooks/1524"
  },
  {
    title: "A Tale of Two Cities",
    author: "Charles Dickens",
    description: "Set in London and Paris during the French Revolution, the novel follows the lives of several characters, including Charles Darnay and Sydney Carton. A story of self-sacrifice and redemption.",
    genre: "Historical Fiction",
    language: "English",
    year: 1859,
    pages: 448,
    cover_gradient: "linear-gradient(135deg, #450a0a, #dc2626)",
    gutenberg_id: 98,
    gutenberg_url: "https://www.gutenberg.org/ebooks/98"
  },
  {
    title: "Jane Eyre",
    author: "Charlotte Bronte",
    description: "The story of a plain yet passionate orphan girl who becomes a governess and falls in love with her brooding employer, Mr. Rochester. A pioneering work of psychological depth and social criticism.",
    genre: "Romance",
    language: "English",
    year: 1847,
    pages: 532,
    cover_gradient: "linear-gradient(135deg, #831843, #db2777)",
    gutenberg_id: 1260,
    gutenberg_url: "https://www.gutenberg.org/ebooks/1260"
  },
  {
    title: "The Count of Monte Cristo",
    author: "Alexandre Dumas",
    description: "Edmond Dantès is falsely imprisoned, escapes after years, discovers a hidden treasure, and reinvents himself as the wealthy Count of Monte Cristo to exact revenge on those who wronged him.",
    genre: "Adventure",
    language: "English",
    year: 1844,
    pages: 1276,
    cover_gradient: "linear-gradient(135deg, #1e3a5f, #3b82f6)",
    gutenberg_id: 1184,
    gutenberg_url: "https://www.gutenberg.org/ebooks/1184"
  },
  {
    title: "Around the World in Eighty Days",
    author: "Jules Verne",
    description: "The eccentric Phileas Fogg and his French valet Passepartout attempt to circumnavigate the world in 80 days on a £20,000 wager. A thrilling adventure filled with exotic locales and ingenious escapes.",
    genre: "Adventure",
    language: "English",
    year: 1872,
    pages: 256,
    cover_gradient: "linear-gradient(135deg, #064e3b, #059669)",
    gutenberg_id: 103,
    gutenberg_url: "https://www.gutenberg.org/ebooks/103"
  },
  {
    title: "20,000 Leagues Under the Sea",
    author: "Jules Verne",
    description: "Professor Aronnax is captured and taken aboard the Nautilus, the submarine commanded by the mysterious Captain Nemo. An epic underwater adventure exploring the depths of the ocean.",
    genre: "Science Fiction",
    language: "English",
    year: 1870,
    pages: 384,
    cover_gradient: "linear-gradient(135deg, #0c4a6e, #0284c7)",
    gutenberg_id: 164,
    gutenberg_url: "https://www.gutenberg.org/ebooks/164"
  },
  {
    title: "The War of the Worlds",
    author: "H.G. Wells",
    description: "Martians invade Earth, attacking with seemingly unstoppable war machines. One of the earliest and most influential science fiction novels, exploring themes of imperialism and human vulnerability.",
    genre: "Science Fiction",
    language: "English",
    year: 1898,
    pages: 188,
    cover_gradient: "linear-gradient(135deg, #1a0a00, #c2410c)",
    gutenberg_id: 36,
    gutenberg_url: "https://www.gutenberg.org/ebooks/36"
  },
  {
    title: "The Time Machine",
    author: "H.G. Wells",
    description: "A scientist travels to the year 802,701 and finds humanity has evolved into two distinct species. One of the first explorations of time travel in fiction and a brilliant social allegory.",
    genre: "Science Fiction",
    language: "English",
    year: 1895,
    pages: 118,
    cover_gradient: "linear-gradient(135deg, #1e1b4b, #4338ca)",
    gutenberg_id: 35,
    gutenberg_url: "https://www.gutenberg.org/ebooks/35"
  },
  {
    title: "A Study in Scarlet",
    author: "Arthur Conan Doyle",
    description: "The very first appearance of Sherlock Holmes and Dr. Watson, in which they solve a mysterious murder in London that is connected to events that took place years earlier in Utah.",
    genre: "Mystery",
    language: "English",
    year: 1887,
    pages: 168,
    cover_gradient: "linear-gradient(135deg, #1c1917, #57534e)",
    gutenberg_id: 244,
    gutenberg_url: "https://www.gutenberg.org/ebooks/244"
  },
  {
    title: "The Adventures of Tom Sawyer",
    author: "Mark Twain",
    description: "The story of a young boy growing up along the Mississippi River in the fictional town of St. Petersburg, Missouri. Tom's adventures with his friends and the town's social dynamics make for timeless reading.",
    genre: "Adventure",
    language: "English",
    year: 1876,
    pages: 242,
    cover_gradient: "linear-gradient(135deg, #7c2d12, #ea580c)",
    gutenberg_id: 74,
    gutenberg_url: "https://www.gutenberg.org/ebooks/74"
  },
  {
    title: "Wuthering Heights",
    author: "Emily Bronte",
    description: "A dark, passionate story of the intense and almost demonic love between Catherine Earnshaw and Heathcliff, a foundling boy. Set on the Yorkshire moors, it is a tale of revenge and obsession.",
    genre: "Romance",
    language: "English",
    year: 1847,
    pages: 342,
    cover_gradient: "linear-gradient(135deg, #2d1b69, #6d28d9)",
    gutenberg_id: 768,
    gutenberg_url: "https://www.gutenberg.org/ebooks/768"
  },
  {
    title: "Don Quixote",
    author: "Miguel de Cervantes",
    description: "Often considered the first modern novel, it follows an aging nobleman who reads so many chivalric romances that he decides to become a knight-errant. A profound exploration of reality versus imagination.",
    genre: "Classic",
    language: "English",
    year: 1605,
    pages: 863,
    cover_gradient: "linear-gradient(135deg, #78350f, #b45309)",
    gutenberg_id: 996,
    gutenberg_url: "https://www.gutenberg.org/ebooks/996"
  },
  {
    title: "The Scarlet Letter",
    author: "Nathaniel Hawthorne",
    description: "Set in 17th-century Puritan New England, Hester Prynne is forced to wear a scarlet 'A' for adultery on her chest. A powerful exploration of sin, guilt, and redemption in Puritan society.",
    genre: "Historical Fiction",
    language: "English",
    year: 1850,
    pages: 238,
    cover_gradient: "linear-gradient(135deg, #450a0a, #b91c1c)",
    gutenberg_id: 25344,
    gutenberg_url: "https://www.gutenberg.org/ebooks/25344"
  },
  {
    title: "Treasure Island",
    author: "Robert Louis Stevenson",
    description: "Young Jim Hawkins discovers a treasure map leading to buried pirate gold on a remote island. A classic adventure tale featuring the iconic Long John Silver, a cunning and charismatic pirate.",
    genre: "Adventure",
    language: "English",
    year: 1883,
    pages: 300,
    cover_gradient: "linear-gradient(135deg, #0c4a6e, #0369a1)",
    gutenberg_id: 120,
    gutenberg_url: "https://www.gutenberg.org/ebooks/120"
  },
  {
    title: "Great Expectations",
    author: "Charles Dickens",
    description: "The growth of an orphan named Pip who rises from humble origins to gentility and eventual moral redemption. One of Dickens' greatest works, filled with vivid characters and social commentary.",
    genre: "Classic",
    language: "English",
    year: 1861,
    pages: 544,
    cover_gradient: "linear-gradient(135deg, #14532d, #16a34a)",
    gutenberg_id: 1400,
    gutenberg_url: "https://www.gutenberg.org/ebooks/1400"
  },
  {
    title: "The Republic",
    author: "Plato",
    description: "Plato's best-known work, exploring justice, the ideal state, and the soul through a series of Socratic dialogues. One of the most influential works in Western philosophy and political theory.",
    genre: "Philosophy",
    language: "English",
    year: -380,
    pages: 416,
    cover_gradient: "linear-gradient(135deg, #1e3a5f, #1d4ed8)",
    gutenberg_id: 1497,
    gutenberg_url: "https://www.gutenberg.org/ebooks/1497"
  }
];

// Sample text content for each book
const EXCERPTS = {
  "Pride and Prejudice": `PRIDE AND PREJUDICE
By Jane Austen

Chapter I

It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.

However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.

"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"

Mr. Bennet replied that he had not.

"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."

Mr. Bennet made no answer.

"Do you not want to know who has taken it?" cried his wife impatiently.

"You want to tell me, and I have no objection to hearing it."

This was invitation enough.

"Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it, that he agreed with Mr. Morris immediately; that he is to take possession before Michaelmas, and some of his servants are to be in the house by the end of next week."`,

  "Frankenstein": `FRANKENSTEIN; OR, THE MODERN PROMETHEUS
By Mary Wollstonecraft Shelley

Letter I

To Mrs. Saville, England
St. Petersburgh, Dec. 11th, 17—

You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.

I am already far north of London, and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves and fills me with delight. Do you understand this feeling? This breeze, which has travelled from the regions towards which I am advancing, gives me a foretaste of those icy climes. Inspirited by this wind of promise, my daydreams become more fervent and vivid. I try in vain to be persuaded that the pole is the seat of frost and desolation; it ever presents itself to my imagination as the region of beauty and delight.`,

  "Moby Dick": `MOBY-DICK; OR, THE WHALE
By Herman Melville

CHAPTER 1. Loomings.

Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street, and methodically knocking people's hats off—then, I account it high time to get to sea as soon as I can. This is my substitute for pistol and ball. With a philosophical flourish Cato throws himself upon his sword; I quietly take to the ship.`
};

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Starting seed...');

    // Read schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
    console.log('Schema applied.');

    // Create upload directory
    const uploadDir = path.join(__dirname, '../../uploads/books');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    // Check if already seeded
    const existing = await client.query('SELECT COUNT(*) FROM books');
    if (parseInt(existing.rows[0].count) > 0) {
      console.log(`Database already has ${existing.rows[0].count} books. Skipping seed.`);
      return;
    }

    // Insert books
    for (const book of BOOKS) {
      // Create a text file with excerpt
      const excerpt = EXCERPTS[book.title] ||
        `${book.title.toUpperCase()}\nBy ${book.author}\n\n${book.description}\n\nPublished: ${book.year}\nPages: ${book.pages}\n\n[Full text available at Project Gutenberg: ${book.gutenberg_url}]\n\nThis is a public domain work. The complete text can be downloaded from Project Gutenberg.`;

      const fileName = `${book.title.replace(/[^a-zA-Z0-9]/g, '_')}_excerpt.txt`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, excerpt, 'utf8');

      await client.query(
        `INSERT INTO books (title, author, description, genre, language, year, pages,
                            cover_gradient, cover_color, file_path, file_name, file_size,
                            file_type, gutenberg_id, gutenberg_url, is_public, download_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, $16)`,
        [
          book.title, book.author, book.description, book.genre,
          book.language, book.year, book.pages,
          book.cover_gradient, book.cover_gradient.split(',')[1]?.trim().replace(')', '') || '#3b82f6',
          fileName, fileName, Buffer.byteLength(excerpt, 'utf8'),
          'text/plain', book.gutenberg_id, book.gutenberg_url,
          Math.floor(Math.random() * 5000) + 100
        ]
      );
      console.log(`  ✓ ${book.title}`);
    }

    console.log(`\nSeed complete! Inserted ${BOOKS.length} books.`);
  } catch (err) {
    console.error('Seed error:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

seed();
