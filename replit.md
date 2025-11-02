# Overview

KingGames is a real-time multiplayer casino gaming platform built with React, Express, and Socket.io. The platform features multiple games including Lucky 7 (a card betting game) and Coin Toss. Players join synchronized game rooms where they can place bets before a countdown reveals the result. The application features a comprehensive betting system with virtual chips, user authentication, game history tracking, and immersive audio/visual effects.

# Recent Changes

**November 2, 2025**: Added WhatsApp-based deposit/withdrawal system
- **Deposit Dialog**: Created user-facing deposit dialog accessible from dashboard header
  - Green "Deposit" button with wallet icon in UserDashboard header
  - Dialog displays configurable message and opens WhatsApp with pre-filled text
  - Fetches settings from public API endpoint for seamless user experience
- **Admin Configuration**: Added deposit settings management in Game Management page
  - Admin can configure WhatsApp number (with country code)
  - Customizable deposit message shown to users before contacting via WhatsApp
  - Settings saved via authenticated admin endpoint
- **Database Schema**: Created deposit_settings table to store WhatsApp configuration
  - Stores whatsappNumber (varchar) and depositMessage (text)
  - Tracks last update timestamp
  - Database table created via db:push command

**October 30, 2025**: Enhanced Lucky 7 game with betting features and instant join
- **Instant Join**: Players can now join mid-round and immediately see countdown/bet if time remains
  - Server sends current game state (countdown, status, card if revealed) when player joins
  - Client syncs state instantly via game-state socket event
  - No more waiting for next round - join and play immediately
- **Repeat and Lock Betting**: 
  - Implemented bet locking system allowing players to lock their bets for the next round
  - Added repeat bet feature to quickly replay previous round's betting strategy
  - Enhanced GameRoom.tsx with unlocked/locked bet state management
  - Added Lock, Cancel, and Repeat buttons visible at all times in grid layout
  - Integrated socket event listeners for bet-placed, bets-locked, and bets-cancelled events

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built with React and TypeScript using Vite as the build tool. The UI leverages Radix UI components with Tailwind CSS for styling, providing a cohesive casino-themed design system. State management is handled through Zustand stores for game state, audio controls, and authentication. The application includes Three.js integration for potential 3D visual effects and immersive gaming elements.

## Backend Architecture
The server uses Express.js with Socket.io for real-time multiplayer functionality. Game logic is centralized in a GameManager class that handles room management, synchronized countdowns, and betting mechanics. Session-based authentication is implemented with role-based access control (user/admin). The architecture separates concerns between HTTP routes for authentication/data access and WebSocket events for real-time game interactions.

## Database Design
PostgreSQL database with Drizzle ORM handles data persistence. The schema includes:
- **users**: Authentication credentials and role management
- **players**: Game-specific data including chips balance and statistics
- **games**: Match history and game outcome records
- **bets**: Wagering records for Lucky 7 and Coin Toss games
- **chat_messages**: In-game communication logs
- **deposit_settings**: WhatsApp configuration for deposit/withdrawal system

The design supports tracking bet outcomes, player statistics, complete game audit trails, and flexible deposit management via WhatsApp integration.

## Real-time Communication
Socket.io manages all real-time features including room joining/leaving, synchronized countdowns, simultaneous card reveals, and live chat. Events are structured to maintain game state consistency across all connected clients, ensuring fair gameplay and synchronized experiences.

## Authentication & Authorization
Session-based authentication with bcrypt password hashing provides secure user management. The system supports both regular users and admin roles, with middleware protecting sensitive routes and admin functionality like user management dashboards.

## Audio System
Custom audio management with support for background music, sound effects (card reveals, countdowns, betting actions), and user-controlled muting. Audio files are handled as Vite assets with proper loading and playback controls.

# External Dependencies

## Database Services
- **PostgreSQL**: Primary database for user accounts, game history, betting records, and chat logs
- **Neon Database**: Serverless PostgreSQL provider via `@neondatabase/serverless`

## Real-time Communication
- **Socket.io**: WebSocket library enabling real-time multiplayer game rooms, synchronized events, and live chat functionality

## Authentication & Security
- **bcrypt**: Password hashing for secure user credential storage
- **express-session**: Session management for user authentication state

## UI Framework & Styling
- **Radix UI**: Comprehensive component library providing accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework for responsive casino-themed styling
- **React Three Fiber**: 3D rendering capabilities for enhanced visual effects

## Development & Build Tools
- **Vite**: Fast build tool and development server with HMR support
- **TypeScript**: Type safety across frontend and backend code
- **Drizzle**: Type-safe SQL ORM with migration support

## State Management & Data Fetching
- **Zustand**: Lightweight state management for game state, audio, and user data
- **TanStack Query**: Server state management and caching for API interactions

## Audio & Assets
- **GLSL shader support**: For advanced visual effects
- **Multi-format audio support**: MP3, OGG, WAV files for game sounds and music