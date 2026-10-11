(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const menu = $('.menu-button');
  const nav = $('#nav');
  const closeMenu = () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Отвори менюто'); };
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Затвори менюто' : 'Отвори менюто');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menu.focus(); } });
  document.addEventListener('click', e => { if (!e.target.closest('.header')) closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 850) closeMenu(); });

  // A transparent demonstration model, not a roof survey or hourly energy simulation.
  const assumptions = Object.freeze({ yield: 1300, panelPower: .45, panelArea: 2.2, costPerKwp: 1200, batteryCost: 3500, tariff: .18 });
  const model = ({ consumption, roof, budget, battery, property }) => {
    const annualDemand = consumption * 12;
    const funds = budget - (battery ? assumptions.batteryCost : 0);
    const demandPanels = annualDemand / assumptions.yield / assumptions.panelPower;
    const roofPanels = roof / assumptions.panelArea;
    const budgetPanels = Math.max(0, funds) / assumptions.costPerKwp / assumptions.panelPower;
    const count = Math.floor(Math.min(demandPanels, roofPanels, budgetPanels) + 1e-9);
    if (count < 1) return { count: 0, funds, annualDemand };
    const power = count * assumptions.panelPower;
    const generation = power * assumptions.yield;
    const assumedShare = property === 'business' ? (battery ? .8 : .65) : (battery ? .65 : .4);
    const own = Math.min(generation * assumedShare, annualDemand);
    return { count, power, generation, own, excess: generation - own, share: own / generation, savings: own * assumptions.tariff, area: count * assumptions.panelArea, cost: power * assumptions.costPerKwp + (battery ? assumptions.batteryCost : 0), annualDemand, constraint: Math.min(demandPanels,roofPanels,budgetPanels) === roofPanels ? 'площта' : Math.min(demandPanels,roofPanels,budgetPanels) === budgetPanels ? 'бюджетът' : 'годишното потребление' };
  };
  const format = (n, digits = 0) => new Intl.NumberFormat('bg-BG', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  const catalogToggle = $('#catalog-battery');
  if (catalogToggle) catalogToggle.addEventListener('change', () => {
    document.querySelectorAll('.battery-equipment').forEach(el => { el.textContent = catalogToggle.checked ? 'Примерна батерия 5 kWh · изисква проверка' : 'Без акумулатор · батерията е опция'; });
    document.querySelectorAll('.package .button').forEach(a => { const url = new URL(a.href); url.searchParams.set('battery', catalogToggle.checked ? 'yes' : 'no'); a.href = url.href; });
  });
  const solarForm = $('#solar-form');
  const result = $('#solar-result');
  const emptyResult = result ? result.innerHTML : '';
  if (solarForm) {
    solarForm.addEventListener('input', () => { result.innerHTML = emptyResult; $('#calculation-status').textContent = 'Данните са променени. Изчисли отново сценария.'; });
    solarForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!solarForm.reportValidity()) return;
      const data = new FormData(solarForm);
      const input = { consumption: Number(data.get('consumption')), roof: Number(data.get('roof')), budget: Number(data.get('budget')), battery: data.get('battery') === 'yes', property: data.get('property') };
      if (![input.consumption,input.roof,input.budget].every(n => Number.isFinite(n) && n > 0)) return;
      const m = model(input);
      if (!m.count) {
        result.innerHTML = '<span class="eyebrow">02 / ПРЕДВАРИТЕЛЕН СЦЕНАРИЙ</span><h2 id="result-heading" class="result-heading">Няма конфигурация в тези граници.</h2><p class="result-warning">При въведените данни не се побира дори един примерен панел 450 Wp. Нужни са поне 2,2 m², 540 € за панелния ценови модел и достатъчно потребление; батерията добавя 3 500 €.</p><p class="result-fine">Провери бюджета, достъпната площ и избора на батерия. Не можем да обещаем реализуем проект само от тези данни.</p><div class="result-next"><h3>Следваща стъпка</h3><p>Обсъди конкретния покрив и пълния инвестиционен разход със специалист.</p><a class="button dark" href="contact.html">Към демонстрационна заявка <span>↗</span></a></div>';
        $('#calculation-status').textContent = 'Не е намерена конфигурация в зададените граници.';
        return;
      }
      const metric = (value,label) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`;
      const bar = (label,value) => `<div class="energy-row"><div><span>${label}</span><strong>${format(value,1)} kWh</strong></div><div class="bar-track"><span style="--fill:${value/m.generation*100}%"></span></div></div>`;
      const query = new URLSearchParams({ property: input.property, consumption: String(input.consumption), battery: input.battery ? 'yes' : 'no', city: String(data.get('city')) });
      result.innerHTML = `<span class="eyebrow">02 / ТВОЯТ ПРЕДВАРИТЕЛЕН СЦЕНАРИЙ</span><h2 id="result-heading" class="result-heading">Отправна точка за твоя обект</h2><div class="power-result">${format(m.power,2)} <small>kWp</small></div><p class="result-sub">${m.count} примерни панела × 450 Wp · ${input.battery ? 'с примерна батерия 5 kWh' : 'без батерия'}</p><div class="metrics">${metric(format(m.generation)+' kWh','примерна годишна генерация')}${metric(format(m.savings)+' €','избегнат разход за година')}${metric(format(m.area,1)+' m²','площ на самите панели')}${metric(format(m.share*100)+'%','допуснато собствено потребление')}${metric(format(m.cost)+' €','демонстрационна комплектация')}${metric(format(m.annualDemand)+' kWh','въведено годишно потребление')}</div><div class="energy-chart" role="img" aria-label="Примерна годишна генерация ${format(m.generation)} киловатчаса; собствено потребление ${format(m.own,1)}; излишък ${format(m.excess,1)}. Излишъкът не носи доход в модела.">${bar('Генерация',m.generation)}${bar('Използвани на място',m.own)}${bar('Излишък · без оценен доход',m.excess)}</div><p class="result-fine">${format(m.power,2)} × 1 300 = ${format(m.generation)} kWh/год.<br>${format(m.own,1)} × 0,18 €/kWh ≈ ${format(m.savings)} €/год.<br>Ограничаващ фактор в модела: ${m.constraint}. Реалният монтаж може да изисква повече площ и средства. Ценовото допускане не е пълна оферта. Не се изчисляват приходи от износ или срок на изплащане.</p><div class="result-next"><h3>От числата към конкретния покрив.</h3><p>Следват проверка на ориентацията, засенчването, конструкцията и почасовото потребление. Батерията не е почасово моделирана.</p><a class="button dark" href="contact.html?${query}">Продължи с демонстрационна заявка <span>↗</span></a></div>`;
      $('#calculation-status').textContent = `Изчислено: ${format(m.power,2)} киловата пик, ${format(m.generation)} киловатчаса за година. Резултатът е под формата.`;
      if (window.innerWidth <= 850) result.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
  }
  const request = $('#request-form');
  if (request) {
    const query = new URLSearchParams(location.search);
    const validSolutions = { home: 'MySolar Home', plus: 'MySolar Plus', business: 'MySolar Business' };
    const solution = query.get('solution');
    if (Object.hasOwn(validSolutions,solution)) { $('#selected-solution').hidden = false; $('#selected-solution').textContent = 'Избрана отправна точка: '+validSolutions[solution]; }
    const setKnown = (name, allowed) => { const value = query.get(name); if (allowed.includes(value)) request.elements.namedItem(name).value = value; };
    setKnown('property',['home','business']);
    if (solution === 'business') request.elements.namedItem('property').value = 'business';
    setKnown('battery',['yes','no','unsure']);
    setKnown('city',['Варна','София','Пловдив','Бургас','Друг град']);
    const consumption = Number(query.get('consumption'));
    if (Number.isInteger(consumption) && consumption > 0 && consumption <= 100000) request.elements.namedItem('consumption').value = String(consumption);
    const phone = request.elements.namedItem('phone');
    phone.addEventListener('input', () => { const count = phone.value.replace(/\D/g,'').length; phone.setCustomValidity(phone.value && (count < 7 || count > 15) ? 'Въведи телефон със 7 до 15 цифри.' : ''); });
    request.addEventListener('submit', e => {
      e.preventDefault();
      const name = request.elements.namedItem('name');
      name.setCustomValidity(name.value.trim().length < 2 ? 'Въведи име с поне два символа.' : '');
      if (!request.reportValidity()) return;
      request.reset();
      $('#selected-solution').hidden = true;
      const confirmation = $('#request-confirmation');
      confirmation.hidden = false;
      confirmation.focus();
    });
    request.elements.namedItem('name').addEventListener('input', e => e.target.setCustomValidity(''));
    $('#request-again').addEventListener('click', () => { $('#request-confirmation').hidden = true; request.elements.namedItem('name').focus(); });
    request.addEventListener('input', () => { $('#request-confirmation').hidden = true; });
  }
  // Bulgarian validation messages; no cookies, storage, analytics, or form requests.
  document.querySelectorAll('input,select,textarea').forEach(field => {
    field.addEventListener('invalid', () => {
      if (field.validity.customError) return;
      if (field.validity.valueMissing) field.setCustomValidity(field.type === 'checkbox' ? 'Потвърди, че разбираш демонстрационния характер на формата.' : 'Попълни това поле.');
      else if (field.validity.typeMismatch) field.setCustomValidity('Въведи валиден имейл адрес.');
      else if (field.validity.patternMismatch) field.setCustomValidity('Въведи валиден телефонен номер.');
      else if (field.validity.rangeUnderflow || field.validity.rangeOverflow) field.setCustomValidity(`Въведи стойност от ${field.min} до ${field.max}.`);
      else if (field.validity.stepMismatch) field.setCustomValidity('Въведи стойност с допустимата стъпка.');
      else if (field.validity.tooShort) field.setCustomValidity('Въведи поне два символа.');
    });
    field.addEventListener('input', () => { if (field.name !== 'phone') field.setCustomValidity(''); });
  });
})();
