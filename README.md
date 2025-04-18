# Doctor Feel Good - EMDR Therapy Assistant

An accessible web application for Eye Movement Desensitization and Reprocessing (EMDR) therapy. This tool provides both visual and auditory bilateral stimulation to assist therapists during EMDR sessions.

## Features

- **Visual Bilateral Stimulation**: Smooth moving red target that follows a ping-pong pattern
- **Audio Bilateral Stimulation**: Synthesized tones that alternate between left and right channels
- **Customizable Settings**: Adjust speed, tone frequencies to tailor the experience
- **Accessible Design**: Built with screen reader compatibility and keyboard accessibility in mind

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository and navigate to the project directory:

```bash
git clone https://github.com/yourusername/doctorfeelgood.git
cd doctorfeelgood
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

## Usage

1. Adjust the speed and tone frequencies using the sliders to set up your preferred parameters
2. Click "Start Session" to begin the EMDR bilateral stimulation
3. The red target will move back and forth across the screen while audio tones alternate between left and right channels
4. Click "Stop Session" at any time to end the stimulation

## Technology Stack

- **Next.js**: React framework for server-rendered applications
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Tone.js**: Web Audio framework for audio synthesis
- **Framer Motion**: Animation library for smooth visual transitions

## Accessibility Considerations

- Screen reader announcements for target position changes
- Keyboard navigable controls
- Color contrast ratio compliance
- Aria-labels on interactive elements

## License

This project is licensed under the MIT License - see the LICENSE file for details.
