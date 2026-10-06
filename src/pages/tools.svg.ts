/** The tools' marks as one file of SVG symbols (data/tools.ts), built to dist/tools.svg. */
import { toolSprite } from '../data/tools';

export const GET = () => new Response(toolSprite, { headers: { 'Content-Type': 'image/svg+xml' } });
