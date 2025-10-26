# Patrick Woods - My Personal Website

A modern, responsive personal website showcasing my software development skills, projects, and professional experience. Built with Next.js, TypeScript, and Tailwind CSS.t

## Features

- **Multi-page Architecture**: Separate pages for Home, About, Projects, and Skills
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Interactive Contact Modal**: Popup contact information accessible from navigation and home page
- **Project Showcase**: Detailed project cards with skill tags and descriptions
- **Skills Organization**: Categorized technical skills with color-coded tags
- **Resume Download**: Direct download functionality for PDF resume
- **Professional UI**: Clean, modern design with consistent branding
- **Scrollable Projects**: Projects page allows scrolling to view all content
- **Fixed Layout**: Other pages maintain fixed height for consistent user experience

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context API

## Project Structure

```
├── app/
│   ├── about/           # About page
│   │   └── page.tsx
│   ├── projects/        # Projects page
│   │   ├── layout.tsx   # Custom layout for scrolling
│   │   └── page.tsx
│   ├── skills/          # Skills page
│   │   └── page.tsx
│   ├── home/            # Home page
│   │   └── page.tsx
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Redirects to /home
├── components/          # Reusable components
│   ├── sections/        # Page sections
│   │   ├── HomePage.tsx
│   │   ├── AboutSection.tsx
│   │   ├── ProjectsSection.tsx
│   │   └── SkillsSection.tsx
│   ├── Navigation.tsx   # Navigation component
│   ├── SkillTag.tsx     # Reusable skill tag component
│   └── ContactModalProvider.tsx # Contact modal context
├── data/
│   └── skills.ts        # Skill color mappings and categories
├── public/              # Static assets
│   ├── resume.pdf       # Resume PDF
│   └── patrick-woods-photo.jpeg # Profile photo NEED TO UPDATE
├── next.config.js       # Next.js configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## Pages & Content

### Home Page (`/home`)
- Professional introduction with photo
- Links to Skills & Resume and Contact modal
- Clean, modern home page section

### About Page (`/about`)
- Personal background and experience
- Focus on RFP-Pilot, Edge LLMs research, and BCDA LLC work
- Professional narrative of career journey

### Projects Page (`/projects`)
- **RFP-Pilot**: Multi-agent RAG platform
- **Clemson AI Research - Edge LLMs**: Edge device LLM optimization
- **Clemson AI Research - RAG Systems**: HPC-based RAG development
- **BCDA LLC Network Infrastructure**: Network expansion and staff training
- Each project includes detailed descriptions and skill tags

### Skills Page (`/skills`)
- Comprehensive technical skills organized by category
- Color-coded skill tags for visual consistency
- Direct resume download functionality
- Categories: Programming Languages, Frameworks & Libraries, Development Tools, Operating Systems, AI/ML/HPC, Backend & Cloud, Networking & Infrastructure

## Key Features Implemented

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Interactive Elements**: Contact modal with LinkedIn and contact info
- **Skill Management**: Centralized skill definitions with consistent colors
- **Project Showcase**: Detailed project cards with technology stacks
- **Professional Branding**: Consistent blue accent color throughout
- **Scroll Management**: Fixed-height pages with scrollable projects section

## Development Notes

- Built with Next.js 14 App Router for optimal performance
- TypeScript for type safety and better development experience
- Tailwind CSS for rapid, consistent styling
- Lucide React for professional iconography
- React Context for global state management
- Custom layouts for different page behaviors


## Contact

- **Website**: [pnwoods.com](https://pnwoods.com)
- **LinkedIn**: https://www.linkedin.com/in/pnwoods/
- **Email**: woods.patrick@icloud.com

---

*This website showcases my full-stack development skills, AI/ML research experience, and professional work in network infrastructure and software development.*
