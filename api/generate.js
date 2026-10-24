export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    return res.status(500).json({ error: 'FAL_KEY가 Vercel 환경 변수에 설정되지 않았습니다.' });
  }

  try {
    let endpoint, bodyData;

    if (req.method === 'POST') {
      endpoint = req.body.endpoint;
      bodyData = req.body.bodyData;
    } else {
      endpoint = req.query.endpoint;
    }

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint가 필요합니다.' });
    }

    const url = `https://queue.fal.run${endpoint}`;
    
    const options = {
      method: req.method,
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      }
    };

    if (req.method === 'POST' && bodyData) {
      options.body = JSON.stringify(bodyData);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

