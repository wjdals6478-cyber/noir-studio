export default async function handler(req, res) {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    return res.status(500).json({ error: "FAL_KEY가 Vercel 환경 변수에 설정되지 않았습니다." });
  }

  // 공통 계정 잠김/크레딧 부족 에러 응답
  const lockedErrorResponse = {
    error: 'API_ACCOUNT_LOCKED',
    message: 'Fal.ai 크레딧이 모두 소진되었거나 계정이 잠겼습니다. 관리자 대시보드에서 크레딧을 충전해 주세요.'
  };

  const checkIsLocked = (status, data) => {
    const dataStr = JSON.stringify(data || {});
    return (
      status === 403 || 
      data?.code === 'TOP_UP' || 
      dataStr.includes('locked') || 
      dataStr.includes('TOP_UP')
    );
  };

  // 1. GET 요청 (정상적인 폴링 및 결과 조회)
  if (req.method === 'GET') {
    const endpoint = req.query.endpoint;
    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint is required for GET requests" });
    }

    try {
      const targetUrl = endpoint.startsWith('http') ? endpoint : `https://queue.fal.run${endpoint}`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json().catch(() => ({}));

      if (checkIsLocked(response.status, data)) {
        return res.status(403).json(lockedErrorResponse);
      }

      return res.status(response.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 2. POST 요청 (생성 요청 및 프론트엔드가 POST로 보낸 상태 폴링 우회 처리)
  if (req.method === 'POST') {
    try {
      const { endpoint, bodyData } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint is missing in request body" });
      }

      // 🛡️ [핵심 방어] 프론트엔드가 POST로 상태 폴링(requests 조회)을 요청한 경우 -> GET으로 강제 우회!
      const isPolling = endpoint.includes('/requests/') || endpoint.startsWith('http');

      if (isPolling) {
        const targetUrl = endpoint.startsWith('http') ? endpoint : `https://queue.fal.run${endpoint}`;
        
        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Key ${FAL_KEY}`,
            'Accept': 'application/json'
          }
        });
        
        const data = await response.json().catch(() => ({}));

        if (checkIsLocked(response.status, data)) {
          return res.status(403).json(lockedErrorResponse);
        }

        return res.status(response.status).json(data);
      }

      // 일반 생성 요청 (POST)
      const isQueueModel = endpoint.includes('minimax') || endpoint.includes('video');
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

      if (checkIsLocked(response.status, data)) {
        return res.status(403).json(lockedErrorResponse);
      }

      return res.status(response.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

