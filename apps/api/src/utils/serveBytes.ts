import type { Response } from "express";

// Serves a Buffer as an HTTP response, honouring a Range header when
// present (RFC 7233). Needed for the invitation-media file routes: without
// it, a <video> element can fail to play at all in some browsers, or at
// best loses the ability to seek/scrub -- there's no CDN in front of these
// bytes-in-Postgres files (see invitationMedia.service.ts), so the browser
// has to be able to ask for just the range it needs. Harmless to use for
// images/PDFs too (browsers just won't send a Range header for those), so
// every invitation-media file route uses this rather than branching on
// mimeType.
export function serveBytesWithRangeSupport(
  req: { headers: { range?: string } },
  res: Response,
  buffer: Buffer,
  mimeType: string,
  fileName: string
) {
  const total = buffer.length;
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
  res.setHeader("Accept-Ranges", "bytes");

  const range = req.headers.range;
  if (!range) {
    res.setHeader("Content-Length", String(total));
    res.status(200).send(buffer);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) {
    res.status(416).setHeader("Content-Range", `bytes */${total}`).end();
    return;
  }

  const start = match[1] ? parseInt(match[1], 10) : total - parseInt(match[2], 10);
  let end = match[2] && match[1] ? parseInt(match[2], 10) : total - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || start > end || start >= total) {
    res.status(416).setHeader("Content-Range", `bytes */${total}`).end();
    return;
  }
  end = Math.min(end, total - 1);

  res.status(206);
  res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
  res.setHeader("Content-Length", String(end - start + 1));
  res.send(buffer.subarray(start, end + 1));
}
