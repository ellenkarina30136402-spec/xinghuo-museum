'use strict';

const find = id => document.getElementById(id);
const groups = {all:'全部', yesterday:'昨天 · 自力更生', today:'今天 · 自主创新', tomorrow:'明天 · 自立自强'};
const sections = {
  all: ['大家好，我是星语。今天，我们从两弹一星出发，看中国科技如何一步步走向深空。','一九六四年，中国第一颗原子弹试验成功。一九七零年，东方红一号发射，中国有了自己的第一颗人造地球卫星。','二零零三年，杨利伟乘神舟五号进入太空。之后，我们有了服务全球的北斗、长期在轨运行的空间站。','二零二四年，嫦娥六号带回人类第一份月球背面样品。想了解哪段历史？你可以直接问我。'],
  yesterday: ['让我们回到两弹一星的年代。一九六四年，中国第一颗原子弹试验成功。','一九六七年，第一颗氢弹试验成功。三年后，东方红一号升空，中国航天迈入卫星时代。','许多科研团队为这些工程长期协作。今天，我们仍可以从他们的工作中理解自力更生与协同攻关。'],
  today: ['从载人航天到北斗，中国科技在许多领域开启了新的探索。','一九九二年，载人航天工程立项。二零零三年，杨利伟搭乘神舟五号进入太空，并于次日安全返回。','二零二零年，北斗三号完成全球组网星座部署。这个星座由三十颗卫星组成。'],
  tomorrow: ['从远望星空到开展在轨科学实验，今天的成果是下一步研究的起点。','二零二一年，天问一号成功着陆火星。二零二二年，中国空间站完成 T 字基本构型。','二零二四年，嫦娥六号带回人类首份月背样品。面向二零三五年，高水平科技自立自强仍是努力的方向。']
};
let chapter = 'all';
let timelineFilter = 'all';
let libraryFilter = 'all';
let answerText = '';
let generation = 0;
let currentUtterance;
let pending;
const speech = window.speechSynthesis;
const portrait = document.querySelector('.portrait');

function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value) node.textContent = value;
  if (className) node.className = className;
  return node;
}

function link(value, url, className) {
  const node = element('a', value, className);
  node.href = url;
  node.target = '_blank';
  node.rel = 'noopener noreferrer';
  return node;
}

function buttons(container, labels, current, select) {
  container.replaceChildren(...Object.entries(labels).map(([key, value]) => {
    const button = element('button', value, key === current ? 'active' : '');
    button.setAttribute('aria-pressed', String(key === current));
    button.addEventListener('click', () => {
      for (const item of container.children) {
        item.classList.toggle('active', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      }
      select(key);
    });
    return button;
  }));
}

function stop(message = '已停止') {
  generation++;
  clearTimeout(pending);
  if (speech) speech.cancel();
  currentUtterance = undefined;
  portrait.classList.remove('speaking');
  find('play').textContent = '开始讲解';
  find('stop').disabled = true;
  find('status').textContent = message;
}

function narrate(lines) {
  stop('准备朗读');
  const token = generation;
  if (!speech || typeof SpeechSynthesisUtterance === 'undefined') {
    find('subtitle').textContent = lines.join(' ');
    stop('此浏览器不支持语音，可阅读文字。');
    return;
  }
  find('play').textContent = '重新讲解';
  find('stop').disabled = false;
  const playLine = index => {
    if (token !== generation) return;
    if (index === lines.length) {
      stop('讲解结束');
      return;
    }
    const line = lines[index];
    const utterance = new SpeechSynthesisUtterance(line);
    currentUtterance = utterance;
    utterance.lang = 'zh-CN';
    utterance.rate = Number(find('rate').value);
    const voices = speech.getVoices();
    const chinese = voices.find(voice => /Yunxi|Yunyang|Kangkang|云希|云扬|康康/i.test(voice.name)) ||
      voices.find(voice => /^zh[-_]CN/i.test(voice.lang)) ||
      voices.find(voice => /^zh/i.test(voice.lang));
    if (chinese) utterance.voice = chinese;
    const textOnly = () => {
      if (token !== generation) return;
      find('subtitle').textContent = lines.join(' ');
      stop('语音未能播放，可阅读文字或启用系统普通话语音。');
    };
    pending = setTimeout(textOnly, 4500);
    utterance.onstart = () => {
      if (token !== generation) return;
      clearTimeout(pending);
      find('subtitle').textContent = line;
      find('status').textContent = '正在讲解 ' + (index + 1) + ' / ' + lines.length;
      portrait.classList.add('speaking');
    };
    utterance.onend = () => {
      if (token !== generation) return;
      clearTimeout(pending);
      portrait.classList.remove('speaking');
      playLine(index + 1);
    };
    utterance.onerror = textOnly;
    speech.speak(utterance);
  };
  playLine(0);
}

const eventEntries = museumData.events.map(event => ({...event, keys:[event.id.slice(0,4)], event:true}));
const entries = [...museumData.records, ...eventEntries];
const clean = value => value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
function tokens(value) {
  const result = new Set();
  for (const word of value.match(/[\p{Script=Han}]+|[a-z\d]+/gu) || []) {
    if (/^[a-z\d]+$/i.test(word)) result.add(word);
    else for (let i=0;i<word.length-1;i++) result.add(word.slice(i,i+2));
  }
  return result;
}
const generic = new Set(['什么','怎么','如何','为何','为什','请问','介绍','一下','多少','几颗','时候','有哪些','哪些','这里','我们','中国','是什','是怎','什么','能不','可以','请介','告诉','诉我']);
function search(query, group = 'all') {
  const value = clean(query);
  const phrases = [...tokens(value)].filter(phrase => !generic.has(phrase));
  return entries.filter(entry => group === 'all' || entry.group === group).map(entry => {
    if (!value) return {entry, score:1};
    const title = clean(entry.title);
    const body = clean(entry.body);
    const keys = entry.keys.map(clean);
    let score = title.includes(value) ? 24 : body.includes(value) ? 9 : 0;
    for (const key of keys) {
      if (key === value) score += 22;
      else if (key.length > 1 && value.includes(key)) score += Math.min(key.length, 8) * 2.8;
    }
    for (const phrase of phrases) {
      if (title.includes(phrase)) score += 2;
      else if (body.includes(phrase)) score += .65;
    }
    return {entry, score};
  }).filter(item => item.score >= (value.length === 1 ? 8 : value ? 3.5 : 1))
    .sort((a,b) => b.score-a.score).map(item => item.entry);
}

function showAnswer(query) {
  const result = search(query)[0];
  const box = find('answer');
  stop('等待讲解');
  box.replaceChildren();
  if (!result) {
    box.append(element('p','资料库没有找到对应答案。试试输入事件名称、人物或年份。'));
    find('read').hidden = true;
    answerText = '';
    return;
  }
  answerText = result.body;
  box.append(element('h3',result.title), element('p',result.body), element('p',result.source,'meta'));
  if (result.url) box.append(link('查看公开来源',result.url));
  find('read').hidden = false;
  if (find('auto').checked) readAnswer();
}

function readAnswer() {
  if (answerText) narrate(answerText.match(/[^。！？\n]+[。！？]?/g) || [answerText]);
}

const photoSelection = {
  '1964-10-16':'atom','1966-10-27':'after','1967-06-17':'after','1970-04-24':'satellite',
  '1978-12-18':'reform','1992-09-21':'crew','1999-09-18':'award','1999-11-20':'crew',
  '2003-10-15':'crew','2007-10-24':'moon1','2008-09-27':'crew','2012-06-18':'station',
  '2013-12-14':'moon1','2016-09-25':'observatory','2019-01-03':'moon1','2020-06-23':'beidou',
  '2020-12-17':'moon5','2021-05-15':'mars','2022-11-03':'station','2024-06-25':'moon6'
};
const contextual = new Set(['1966-10-27','1967-06-17','1992-09-21','1999-11-20','2008-09-27','2012-06-18','2013-12-14','2019-01-03']);
function renderTimeline() {
  const list = museumData.events.filter(event => timelineFilter === 'all' || event.group === timelineFilter);
  find('events').replaceChildren(...list.map(event => {
    const card = element('article','','card');
    const cover = link('',event.url,'cover');
    cover.setAttribute('aria-label',event.title + '：在新窗口打开' + event.source);
    const image = element('img');
    const photo = archivePhotos[photoSelection[event.id]];
    if (photo) {
      image.src = photo[0];
      image.loading = 'lazy';
      image.alt = photo[2];
      image.addEventListener('error', () => cover.replaceChildren(element('span','查看事件资料','no-photo')), {once:true});
      cover.append(image);
    } else {
      cover.append(element('span','查看事件资料','no-photo'));
    }
    const body = element('div','','card-body');
    const time = element('time',event.id);
    time.dateTime = event.id;
    body.append(time,element('h2',event.title),element('p',event.body),link(event.source + ' · 详情',event.url,'source'));
    if (photo) {
      const credit = element('p','','photo-credit');
      credit.append(document.createTextNode((contextual.has(event.id) ? '相关资料 · ' : '') + photo[2] + ' · ' + photo[3] + ' · '),link(photo[4],photo[1]),document.createTextNode(' · 黑白处理'));
      body.append(credit);
    }
    card.append(cover,body);
    return card;
  }));
  const outlook = find('outlook');
  outlook.hidden = timelineFilter === 'yesterday' || timelineFilter === 'today';
  outlook.replaceChildren(element('p','远景目标','eyebrow'),element('h2','面向 2035'),element('p','高水平科技自立自强与进入创新型国家前列，属于面向 2035 年的目标。'),link('中国共产党第二十次全国代表大会报告','https://app.www.gov.cn/govdata/gov/202210/25/493662/article.html'));
}

function renderLibrary() {
  const list = search(find('filter').value.trim(), libraryFilter);
  find('count').textContent = list.length ? '找到 ' + list.length + ' 条资料' : '暂无匹配资料。试试换一个关键词或清除筛选。';
  find('records').replaceChildren(...list.map(entry => {
    const detail = element('details','','record');
    detail.append(element('summary',(entry.event ? entry.id + ' · ' : '') + entry.title));
    for (const paragraph of entry.body.split('\n').filter(Boolean)) detail.append(element('p',paragraph));
    detail.append(element('p',groups[entry.group] + '　｜　' + entry.source,'meta'));
    if (entry.url) detail.append(link('查看公开来源',entry.url));
    return detail;
  }));
}

const routes = {home:'数字讲解厅',timeline:'历史档案',library:'知识库'};
function route() {
  const hash = location.hash.slice(1);
  const page = Object.hasOwn(routes,hash) ? hash : 'home';
  if (page !== 'home') stop('等待讲解');
  for (const key of Object.keys(routes)) find(key).hidden = key !== page;
  for (const anchor of document.querySelectorAll('nav a')) {
    if (anchor.hash === '#' + page) anchor.setAttribute('aria-current','page');
    else anchor.removeAttribute('aria-current');
  }
  document.title = routes[page] + ' · 星火长明';
  window.scrollTo(0,0);
}

buttons(find('chapters'),{...groups,all:'全馆导览'},chapter,key => {
  chapter = key;
  stop('已选择章节');
  find('subtitle').textContent = '点击「开始讲解」收听。';
});
buttons(find('timelineFilters'),groups,timelineFilter,key => {timelineFilter=key;renderTimeline();});
buttons(find('libraryFilters'),groups,libraryFilter,key => {libraryFilter=key;renderLibrary();});
for (const idea of ['东方红一号','北斗三号有多少颗卫星？','空间站 T 字构型']) {
  const button = element('button',idea);
  button.addEventListener('click',() => {find('question').value = idea; showAnswer(idea);});
  find('ideas').append(button);
}
find('ask').addEventListener('submit',event => {
  event.preventDefault();
  const query = find('question').value.trim();
  if (query) showAnswer(query);
});
find('play').addEventListener('click',() => narrate(sections[chapter]));
find('stop').addEventListener('click',() => stop());
find('read').addEventListener('click',readAnswer);
find('filter').addEventListener('input',renderLibrary);
window.addEventListener('hashchange',route);
window.addEventListener('pagehide',() => {if (speech && currentUtterance) speech.cancel();});
renderTimeline();
renderLibrary();
route();
