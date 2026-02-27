javascript:(async function(){
  const random = (min, max) => Math.random() * (max - min) + min;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms + random(-50, 50)));
  
  const simulateMouseMove = (element) => {
    if(!element) return;
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width/2 + random(-15, 15);
    const y = rect.top + rect.height/2 + random(-10, 10);
    
    ['mousemove','mouseenter','mouseover'].forEach(type => {
      element.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: x,
        clientY: y,
        screenX: x + random(0, 100),
        screenY: y + random(0, 100),
        movementX: random(-5, 5),
        movementY: random(-5, 5)
      }));
    });
  };

  const simulateHumanClick = async (element) => {
    if(!element) return false;
    simulateMouseMove(element);
    await sleep(random(200, 500));
    
    const events = [
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }),
      new FocusEvent('focus', { bubbles: true }),
      new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }),
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    ];
    
    for(let ev of events) {
      element.dispatchEvent(ev);
      await sleep(random(30, 80));
    }
    return true;
  };

  const typeLikeHuman = async (element, text, speed = 'normal') => {
    if(!element) return;
    
    await simulateHumanClick(element);
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(random(100, 300));
    
    const speeds = {
      slow: [80, 200],
      normal: [40, 120],
      fast: [20, 60],
      super_slow: [200, 500]
    };
    const [min, max] = speeds[speed] || speeds.normal;
    
    for(let i = 0; i < text.length; i++) {
      const char = text[i];
      const isSpecial = /[.@\-_0-9]/.test(char);
      
      element.value += char;
      
      element.dispatchEvent(new KeyboardEvent('keydown', { 
        key: char, code: 'Key'+char.toUpperCase(), bubbles: true, cancelable: true 
      }));
      element.dispatchEvent(new KeyboardEvent('keypress', { 
        key: char, charCode: char.charCodeAt(0), bubbles: true 
      }));
      element.dispatchEvent(new InputEvent('input', { 
        bubbles: true, data: char, inputType: 'insertText' 
      }));
      element.dispatchEvent(new KeyboardEvent('keyup', { 
        key: char, code: 'Key'+char.toUpperCase(), bubbles: true 
      }));
      
      await sleep(isSpecial ? random(max, max*2) : random(min, max));
    }
    
    element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const findElement = (strategies) => {
    for(let strat of strategies) {
      try {
        let el = null;
        if(typeof strat === 'string') {
          el = document.querySelector(strat);
        } else if(typeof strat === 'function') {
          el = strat();
        }
        if(el && (el.offsetParent !== null || el.getBoundingClientRect().width > 0)) return el;
      } catch(e) {}
    }
    return null;
  };

  const getAllInputs = () => Array.from(document.querySelectorAll('input:not([type="hidden"])'));
  const getAllButtons = () => Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"], a[href="#"], .btn, [class*="button"]'));

  const strategies = [
    {
      name: 'por_texto_exato',
      findEstudante: () => Array.from(document.querySelectorAll('*')).find(el => el.textContent?.trim() === 'Estudante' && el.children.length === 0),
      findRA: ['input[name*="usuario"]', 'input[id*="usuario"]', 'input[id*="ra"]', 'input[placeholder*="RA"]', '#input-usuario-sed'],
      findDigito: ['input[name*="digito"]', 'input[id*="digito"]', 'input[maxlength="1"]', 'input[id*="r2"]'],
      findSenha: ['input[type="password"]', 'input[name*="senha"]', 'input[id*="senha"]', '#input-senha'],
      findBotao: ['button[type="submit"]', 'button[class*="contained"]', '.MuiButton-contained', () => getAllButtons().find(b => b.textContent?.includes('Acessar'))]
    },
    {
      name: 'por_indice',
      findEstudante: () => Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('Estudante')),
      findRA: [() => getAllInputs()[0]],
      findDigito: [() => getAllInputs()[1]],
      findSenha: [() => getAllInputs().find(i => i.type === 'password') || getAllInputs()[2]],
      findBotao: [() => getAllButtons().find(b => b.textContent?.match(/Acessar|Entrar|Login|Confirmar/i))]
    },
    {
      name: 'por_xpath_simulado',
      findEstudante: () => document.evaluate("//text()[contains(., 'Estudante')]/parent::*", document).iterateNext(),
      findRA: [() => document.querySelector('form input:first-of-type'), () => document.querySelector('input:not([type="password"]):not([maxlength="1"])')],
      findDigito: [() => document.querySelector('input[maxlength="1"]')],
      findSenha: [() => document.querySelector('form input[type="password"]')],
      findBotao: [() => document.querySelector('form button:last-of-type')]
    },
    {
      name: 'agressivo_todos_botoes',
      findEstudante: () => getAllButtons().find(b => b.textContent?.includes('Estudante')) || getAllButtons()[0],
      findRA: [() => getAllInputs()[0]],
      findDigito: [() => null],
      findSenha: [() => getAllInputs()[getAllInputs().length-1]],
      findBotao: [() => getAllButtons()[getAllButtons().length-1]]
    }
  ];

  const tentarLogin = async (tentativa, estrategia) => {
    console.log(`Tentativa ${tentativa} usando ${estrategia.name}`);
    
    const estudante = findElement([estrategia.findEstudante]);
    if(estudante) {
      await simulateHumanClick(estudante);
      await sleep(random(1500, 3000));
    }
    
    const ra = findElement(estrategia.findRA);
    const digito = findElement(estrategia.findDigito);
    const senha = findElement(estrategia.findSenha);
    const botao = findElement(estrategia.findBotao);
    
    if(!ra || !senha) {
      throw new Error('Campos não encontrados');
    }
    
    const speeds = ['slow', 'normal', 'fast', 'super_slow'];
    const speed = speeds[tentativa % speeds.length];
    
    await typeLikeHuman(ra, '123456789fds', speed);
    await sleep(random(300, 800));
    
    if(digito) {
      await typeLikeHuman(digito, '7', speed);
      await sleep(random(200, 600));
    }
    
    await typeLikeHuman(senha, 'bruh', speed);
    await sleep(random(500, 1200));
    
    if(botao) {
      await simulateHumanClick(botao);
      
      setTimeout(() => {
        if(botao && !botao.disabled) {
          botao.dispatchEvent(new Event('submit', { bubbles: true }));
          if(botao.form) botao.form.submit();
        }
      }, random(500, 1000));
    } else {
      const form = ra.closest('form');
      if(form) {
        form.dispatchEvent(new Event('submit', { bubbles: true }));
        setTimeout(() => form.submit(), random(300, 600));
      }
    }
    
    return true;
  };

  const injetarDireto = async () => {
    const inputs = getAllInputs();
    if(inputs.length >= 2) {
      inputs[0].value = '123456789fds';
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      
      const senhaInput = inputs.find(i => i.type === 'password') || inputs[inputs.length-1];
      senhaInput.value = 'bruh';
      senhaInput.dispatchEvent(new Event('input', { bubbles: true }));
      senhaInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      const botoes = getAllButtons();
      const botao = botoes.find(b => b.textContent?.includes('Acessar')) || botoes[botoes.length-1];
      if(botao) {
        botao.click();
        botao.dispatchEvent(new Event('submit', { bubbles: true }));
      }
    }
  };

  let sucesso = false;
  let tentativa = 0;
  const maxTentativas = 50;
  
  while(!sucesso && tentativa < maxTentativas) {
    tentativa++;
    
    try {
      const estrategia = strategies[(tentativa - 1) % strategies.length];
      await tentarLogin(tentativa, estrategia);
      
      await sleep(random(2000, 4000));
      
      const urlMudou = !window.location.href.includes('login');
      const painel = document.querySelector('[class*="dashboard"], [class*="home"], [class*="panel"], nav, header');
      
      if(urlMudou || painel || document.title !== 'Login') {
        sucesso = true;
        break;
      }
      
    } catch(e) {
      console.log(`Falha tentativa ${tentativa}: ${e.message}`);
      
      if(tentativa % 5 === 0) {
        await injetarDireto();
        await sleep(random(1000, 2000));
      }
      
      if(tentativa % 10 === 0) {
        window.scrollTo({ top: random(0, document.body.scrollHeight), behavior: 'smooth' });
        await sleep(random(500, 1000));
      }
      
      await sleep(random(1000, 3000));
    }
  }
  
  if(!sucesso) {
    injetarDireto();
  }
})();
