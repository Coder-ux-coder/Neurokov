# The home page video

A short video of Mohid, talking straight to camera, at the top of the home page. It says what
Neurokov does for the viewer, shows it works, removes the risk and asks for one thing: the free
audit. About 150 words, so 55 to 60 seconds at a natural pace.

## Script

> **(Hook, 0:00)** If you run a B2B service business, you're probably great at the work, and your
> pipeline still runs on referrals. Some months are packed. Others go quiet.
>
> **(What we do, 0:10)** I'm Mohid, founder of Neurokov, and we get you clients. We find the
> businesses that should buy from you and start real conversations with the people who decide.
> Every lead that comes to you gets a personal reply in under 60 seconds, day or night. And we
> bring back the old leads sitting in your CRM. You just show up to booked sales calls.
>
> **(Proof, 0:30)** For one growth agency, that was 46 qualified calls in the first 30 days, with
> zero sales hires. A consulting firm went from replying in 19 hours to under a minute, and closed
> 31% more.
>
> **(No risk, 0:45)** Before we start, we agree in writing what we'll deliver. If we don't deliver
> it, you don't pay.
>
> **(Ask, 0:52)** Book your free 30-minute audit below. I'll show you exactly where your next
> clients are.

Every number is from the case studies on the site (`src/data/cases.ts`). If you change one, change
the script too.

## Recording it

- **Landscape, 16:9**, 1080p. A phone on a stand is enough; face a window for light.
- **Sound matters more than picture.** A clip-on mic, a quiet room, no echo.
- **Look at the lens**, not the screen. Read it a few times first, then say it in your own words:
  it should sound like you talking to one person, not reading.
- **First frame:** you, looking at the camera, mid-sentence ready. It becomes the cover.
- **Captions:** most people watch with the sound off first. Export an English `.vtt` subtitle file
  (most editors and phones can make one).

## Putting it on the site

Put the files in `src/assets/video/`:

| File | What it is |
| --- | --- |
| `vsl.mp4` | the video, H.264, under about 15 MB (export at 1080p, around 2 Mbit/s) |
| `vsl.jpg` | its cover: a still of you, 1920 x 1080 |
| `vsl.vtt` | captions (optional, but worth it) |

The home page picks them up on the next build (`src/components/Vsl.astro`). Until `vsl.mp4` is
there, the case study reel plays in its place, so the page never shows an empty frame.
