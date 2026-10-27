export default async function handler(req, res) {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    return res.status(500).json({ error: "FAL_KEY가 Vercel 환경 변수에 설정되지 않았습니다." });
  }

  // 1. GET 요청 (비디오 생성 상태 폴링 및 결과 조회)
  if (req.method === 'GET') {
    const endpoint = req.query.endpoint;
    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint is required for GET requests" });
    }

    try {
      // 절대 URL(status_url)이 들어오면 그대로 사용, 아니면 queue.fal.run 조합
      const targetUrl = endpoint.startsWith('http') ? endpoint : `https://queue.fal.run${endpoint}`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json().catch(() => ({}));
      return res.status(response.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. POST 요청 (이미지 및 비디오 생성 요청)
  if (req.method === 'POST') {
    try {
      const { endpoint, bodyData } = req.body || {};
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint is missing in request body" });
      }

      const isQueueModel = endpoint.includes('minimax') || endpoint.includes('video') || endpoint.includes('queue');
      const baseUrl = isQueueModel ? 'https://queue.fal.run' : 'https://fal.run';

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json' // ⭐️ 406 오류 방지를 위해 Accept 헤더 추가 완료!
        },
        body: JSON.stringify(bodyData || {})
      });

      const data = await response.json().catch(() => ({}));
      return res.status(response.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

