// Consulta somente o CEP; os demais dados do cadastro permanecem no aplicativo.
export const cepDigits = value => String(value || '').replace(/\D/g, '').slice(0, 8);
export function formatCep(value) {
  const digits = cepDigits(value);
  return digits.length > 5 ? digits.slice(0, 5) + '-' + digits.slice(5) : digits;
}
export async function lookupCep(cep, signal) {
  if (!/^\d{8}$/.test(cep)) throw Error('Informe um CEP com 8 dígitos.');
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {signal});
  if (!response.ok) throw Error('Consulta de CEP indisponível. Preencha o endereço manualmente.');
  const data = await response.json();
  if (data.erro) throw Error('CEP não encontrado. Confira o número ou preencha o endereço manualmente.');
  if (cepDigits(data.cep) !== cep || !data.localidade || !data.uf) throw Error('Resposta de CEP inválida. Preencha o endereço manualmente.');
  return {street:data.logradouro || '', neighborhood:data.bairro || '', city:data.localidade, state:data.uf};
}
export function useCep(React, values, setValues, fields, context) {
  const [message, setMessage] = React.useState('');
  const pending = React.useRef(null);
  const version = React.useRef(0);
  React.useEffect(() => {
    version.current++;
    pending.current?.abort();
    setMessage('');
    return () => {version.current++; pending.current?.abort();};
  }, [context]);
  function change(value) {
    const id = ++version.current;
    pending.current?.abort();
    const cep = cepDigits(value);
    setValues(current => ({...current, [fields.cep]:formatCep(value)}));
    setMessage(cep.length && cep.length !== 8 ? 'Digite os 8 dígitos do CEP.' : '');
    if (cep.length !== 8) return;
    const controller = new AbortController();
    pending.current = controller;
    const snapshot = {...values};
    setMessage('Buscando endereço…');
    const timeout = setTimeout(() => controller.abort(), 8000);
    lookupCep(cep, controller.signal).then(address => {
      if (version.current !== id) return;
      setValues(current => {
        if (cepDigits(current[fields.cep]) !== cep) return current;
        const next = {...current};
        for (const key of ['street','neighborhood','city','state']) {
          const field = fields[key];
          // Preserva correções feitas enquanto a consulta estava em andamento.
          if ((current[field] || '') === (snapshot[field] || '')) next[field] = address[key];
        }
        return next;
      });
      setMessage(address.street && address.neighborhood ? 'Endereço preenchido. Confira os dados e informe o número.' : 'CEP localizado. Complete a rua, o bairro e o número que faltarem.');
    }).catch(error => {
      if (version.current === id) setMessage(error.name === 'AbortError' ? 'Consulta demorou demais. Digite o CEP novamente ou preencha o endereço manualmente.' : (error.message || 'Falha ao consultar CEP. Preencha o endereço manualmente.'));
    }).finally(() => clearTimeout(timeout));
  }
  return {change, message};
}
