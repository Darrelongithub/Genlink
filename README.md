# Genlink Hub

Prompt for Lovable AI:

Create a visually stunning, professional, and emotionally captivating website named Genlink Hub. The site should effectively showcase a transformative curriculum grounded in spiritual wealth, financial literacy, ICT skills, and practical online income generation to empower users toward securing generational wealth.

Core Requirements:
Homepage Layout:

A clean, modern, and stylish design inspired by platforms like Brilliant.org, ALUX, and Cisco. Use vibrant yet trust-building color schemes with intuitive navigation.

Introduce the mission: “Renew the Mind, Empower the Generation — Your Journey to Spiritual and Financial Mastery Starts Here.”

Feature an interactive hero banner illustrating spiritual-wealth growth and digital empowerment.

Courses Section:

Categorize courses clearly into Free Courses and Premium Courses, each with distinct styling cues (e.g., premium courses with subtle gold accent borders).

Each course displayed as a tile/card with:

A striking, demonstrative image reflecting the course theme (e.g., mind renewal imagery for mindset courses, forex charts for trading courses, digital code visuals for ICT).

Course title (catchy and professional as per previous outline).

Short engaging course description (mock data).

Duration in weeks.

For premium courses, show mock prices in Kenyan Shillings (e.g., Ksh 7,999, Ksh 12,999).

Interactive buttons for “Learn More” and “Enroll Now”.

Tooltip or hover effects with key benefits or highlights.

Course List to Include:

Mindset Renewal & Spiritual Wealth Mastery (Free, 6 weeks)

Foundations of Financial Wisdom and Wealth Building (Free + Premium Modules, 8 weeks)

Digital Fluency & Tech Mindset Development (Free, 6 weeks)

Forex Trading Fundamentals and Strategy (Free + Premium Masterclass, 10 weeks)

Content Creation, Online Writing & eBook Entrepreneurship (Free + Premium, 10 weeks)

YouTube Monetization & Automation Masterclass (Free + Premium, 8 weeks)

Additional ICT Courses to Populate the Page:

Cybersecurity Essentials (Free, 6 weeks)

Introduction to Cloud Computing (Free, 6 weeks)

Advanced Python Programming (Premium, Ksh 9,999, 8 weeks)

Data Science & Analytics Foundations (Premium, Ksh 12,999, 10 weeks)

IoT (Internet of Things) for Beginners (Free, 6 weeks)

AI & Machine Learning Basics (Premium, Ksh 14,999, 10 weeks)

Interactivity:

Allow filtering/sorting by Free vs Premium, Duration, and Category (Spiritual, Financial, ICT, Income Skills).

Click on a course tile to open a modal/popup with mock “Course Overview,” “What You'll Learn,” “Prerequisites,” and “Next Steps.”

Include user review mock data with star ratings per course.

Responsive design for mobile and desktop views.

Subtle animations on hover and transitions for smooth engagement.

Additional Features:

Call to actions encouraging sign-up for newsletters with updates on upcoming courses and events.

Motivational quotes related to empowerment, wealth, and spiritual growth throughout the site.

A “Why Genlink Hub?” section highlighting the unique blend of spiritual renewal, tech skills, and practical wealth generation.... the attached picture is the logo

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://genink-school-of-the-elites.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/389b21b8-d117-4ba7-b3dd-1dfb7c34fbf0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm ci
cp .env.example .env.local
npm run dev
```

## Genlink + ADAPT

This repository contains both applications. Genlink remains the learner-facing LMS shell; ADAPT is
its separate adaptive-learning engine. The **ADAPT Engine** link in Genlink's top bar opens the
engine UI. Learners who spend a while paused in a Genlink lesson also receive a friendly hand-off
prompt to ADAPT's real check-in and test flow.

`npm run host` is intentionally reserved for ADAPT. It builds and hosts ADAPT's demo/room UI and
API, not Genlink. Prepare it once on Fedora:

```sh
python3 -m venv adapt/.venv
adapt/.venv/bin/python -m pip install -e './adapt/backend[dev]'
npm --prefix adapt/frontend ci
npm run host                 # ADAPT at http://<this-machine>:3000
```

Run `npm run dev` in another terminal for Genlink at port 8080. Both apps bind to all interfaces
for a trusted LAN demo. Set `VITE_ADAPT_URL` in `.env.local` when ADAPT lives at a different origin.
See [`docs/INTEGRATION.md`](docs/INTEGRATION.md) for the boundary and future hand-off contract.
