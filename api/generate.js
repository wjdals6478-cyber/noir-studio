export default async function handler(req, res) {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    return res.status(500).json({ error: "FAL_KEY가 Vercel 환경 변수에 설정되지 않았습니다." });
  }

  // 1. GET 요청 (비디오 생성 상태 폴링)
  if (req.method === 'GET') {
    const endpoint = req.query.endpoint;
    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint is required for GET requests" });
    }

    try {
      // 🛡️ [핵심 방어] 프론트엔드가 작업 전용 주소 대신 모델 경로로 잘못된 GET 폴링을 보낼 때 405 에러를 내지 않고 안전하게 대기 상태 처리
      if (!endpoint.includes('/requests/') && !endpoint.startsWith('http')) {
        return res.status(200).json({ status: "IN_PROGRESS", message: "Waiting for request ID..." });
      }

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

  // 2. POST 요청 (이미지 생성 및 비디오 최초 생성 요청)
  if (req.method === 'POST') {
    try {
      const { endpoint, bodyData } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint is missing in request body" });
      }

      // 비디오 및 큐 모델은 queue.fal.run, 이미지는 fal.run 사용
      const isQueueModel = endpoint.includes('minimax') || endpoint.includes('video') || endpoint.includes('queue');
      const baseUrl = isQueueModel ? 'https://queue.fal.run' : 'https://fal.run';

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json'
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

