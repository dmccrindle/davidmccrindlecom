import { state, SHOWS } from './state.js';
import { esc } from './data.js';

export const wikiCache = {};

async function fetchWikiDirect(name) {
  try {
    const encoded = encodeURIComponent(name.replace(/ /g, '_'));
    const resp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`);
    if (resp.ok) {
      const data = await resp.json();
      return data.thumbnail?.source || data.originalimage?.source || null;
    }
  } catch (e) { }
  return null;
}

async function fetchWikiSearch(searchTerm) {
  try {
    const resp = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*&srlimit=1`);
    if (resp.ok) {
      const data = await resp.json();
      const title = data.query?.search?.[0]?.title;
      if (title) return await fetchWikiDirect(title);
    }
  } catch (e) { }
  return null;
}

async function fetchMusicBrainzImage(artistName) {
  try {
    const resp = await fetch(
      `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(artistName)}&fmt=json&limit=1`,
      { headers: { 'User-Agent': 'ConcertArchive/1.0 (davidmccrindle@mac.com)' } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const artist = data.artists?.[0];
    if (!artist) return null;
    const mbid = artist.id;

    const relResp = await fetch(
      `https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`,
      { headers: { 'User-Agent': 'ConcertArchive/1.0 (davidmccrindle@mac.com)' } }
    );
    if (relResp.ok) {
      const relData = await relResp.json();
      const rels = relData.relations || [];
      const imgRel = rels.find(r => r.type === 'image');
      if (imgRel?.url?.resource) {
        const imgUrl = imgRel.url.resource;
        if (imgUrl.includes('commons.wikimedia.org/wiki/File:')) {
          const fileName = imgUrl.split('File:')[1];
          if (fileName) {
            const commonsResp = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json&origin=*`);
            if (commonsResp.ok) {
              const commonsData = await commonsResp.json();
              const pages = commonsData.query?.pages;
              const page = pages ? Object.values(pages)[0] : null;
              const thumbUrl = page?.imageinfo?.[0]?.thumburl;
              if (thumbUrl) return thumbUrl;
            }
          }
        }
        if (imgUrl.match(/\.(jpg|jpeg|png|webp)/i)) return imgUrl;
      }

      const wdRel = rels.find(r => r.type === 'wikidata');
      if (wdRel?.url?.resource) {
        const wdId = wdRel.url.resource.split('/').pop();
        if (wdId) {
          try {
            const wdResp = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${wdId}&property=P18&format=json&origin=*`);
            if (wdResp.ok) {
              const wdData = await wdResp.json();
              const imgClaim = wdData.claims?.P18?.[0];
              const imgFile = imgClaim?.mainsnak?.datavalue?.value;
              if (imgFile) {
                const commonsResp = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(imgFile)}&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json&origin=*`);
                if (commonsResp.ok) {
                  const commonsData = await commonsResp.json();
                  const pages = commonsData.query?.pages;
                  const page = pages ? Object.values(pages)[0] : null;
                  const thumbUrl = page?.imageinfo?.[0]?.thumburl;
                  if (thumbUrl) return thumbUrl;
                }
              }
            }
          } catch (e) { }
        }
      }
    }
  } catch (e) { }
  return null;
}

export async function fetchWikiImage(name, type) {
  const cacheKey = type + ':' + name;
  if (wikiCache[cacheKey]) return wikiCache[cacheKey].img;

  let img = null;

  if (type === 'artist' || type === 'support') {
    img = await fetchMusicBrainzImage(name);
    if (!img) img = await fetchWikiDirect(name);
    if (!img) img = await fetchWikiSearch(name + ' band');
    if (!img) img = await fetchWikiSearch(name + ' musician');
  } else if (type === 'venue') {
    img = await fetchWikiDirect(name);
    if (!img) img = await fetchWikiSearch(name + ' venue');
  } else if (type === 'city') {
    img = await fetchWikiDirect(name);
    if (!img) img = await fetchWikiSearch(name + ' city');
  }

  wikiCache[cacheKey] = { img, fetched: true };
  return img;
}

export function loadAccordionImage(elemId, name, type) {
  const spinner = document.getElementById(elemId + '-loader');
  fetchWikiImage(name, type).then(url => {
    if (spinner) spinner.classList.add('hidden');
    const wrap = document.getElementById(elemId);
    if (!wrap) return;
    if (url) {
      wrap.classList.add('loaded');
      const img = wrap.querySelector('img');
      img.src = url;
      img.onload = () => img.classList.add('show');
    }
  }).catch(() => {
    if (spinner) spinner.classList.add('hidden');
  });
}

export function getArtistStats(name) {
  let count = 0, firstYear = 9999, lastYear = 0, cities = new Set();
  SHOWS.forEach(s => {
    const acts = [s.artist, ...(s.support || '').split(';').map(x => x.trim())].filter(Boolean);
    if (acts.includes(name)) {
      count++;
      const yr = parseInt(s.date.slice(0, 4));
      if (yr < firstYear) firstYear = yr;
      if (yr > lastYear) lastYear = yr;
      cities.add(s.city);
    }
  });
  return { count, firstYear, lastYear, cities: cities.size };
}

export function getVenueStats(name) {
  let count = 0, artists = new Set(), firstYear = 9999, lastYear = 0;
  SHOWS.forEach(s => {
    if (s.venue === name) {
      count++;
      artists.add(s.artist);
      const yr = parseInt(s.date.slice(0, 4));
      if (yr < firstYear) firstYear = yr;
      if (yr > lastYear) lastYear = yr;
    }
  });
  return { count, artists: artists.size, firstYear, lastYear };
}

export function getCityStats(name) {
  let count = 0, venues = new Set(), artists = new Set();
  SHOWS.forEach(s => {
    if (s.city === name) {
      count++;
      venues.add(s.venue);
      artists.add(s.artist);
    }
  });
  return { count, venues: venues.size, artists: artists.size };
}
