const tableView = `
<table class="table">
  <tbody>
    <tr class="attempts">
      <td>
      </td>

      <td class="summary">
        Сумма
      </td>
    </tr>

  </tbody>
</table>`;

const Urls = {
  ATTEMPTS: './data_attempts.json',
  CARS: './data_cars.json',
};

const errorMessage = 'Произошла ошибка при загрузке данных. Повторите попытку позже.';

let participants;
let attempts;

/**
 * Посылает запрос на получение данных.
 * @param {string} url - адрес.
 * @returns {object} распарсенный ответ.
 */
const getData = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
  const json = await response.json();
  return json;
};

const getAttemptsAmount = () => {
  const attemptsAmount = attempts.reduce((accumulator, attempt) => {
    if (attempt.id === 1) {
      accumulator++;
    }
    return accumulator;
  }, 0);

  return attemptsAmount;
};

/**
 * Добавляет в таблицу столбцы попыток.
 * @param {HTMLElement} tableElement - элемент таблицы.
 * @param {number} attemptsAmount - количество попыток.
 */
const insertAttempts = (tableElement, attemptsAmount) => {
  const getAttemptCell = (attemptNum) => (`<td>Попытка №${attemptNum}</td>`);
  for (let i = 1; i <= attemptsAmount; i++) {
    tableElement.querySelector('.summary').insertAdjacentHTML('beforebegin', getAttemptCell(i));
  }
};

/**
 * Добавляет в таблицу строчки участников.
 * @param {HTMLElement} tableElement - элемент таблицы.
 * @param {number} attemptsAmount - количество попыток.
 */
const insertParticipants = async (tableElement, attemptsAmount) => {
  const getParticipantCells = () => {
    const result = [];
    for (let i = 1; i <= attemptsAmount; i++) {
      result.push(`<td class="attempt attempt-${i}"></td>`);
    }

    return result.join('\n');
  };

  const getParticipantRow = (participant) => {
    const rowElement = document.createElement('tr');
    rowElement.classList.add('participant');
    rowElement.dataset.id = participant.id;
    rowElement.innerHTML = `
      <td class="participant-name">${participant.name}</td>
      ${getParticipantCells()}
      <td class="participant-score" data-id="${participant.id}"></td>`;
    rowElement.querySelector('.participant-name').addEventListener('mouseover', nameMouseOverHandler);
    rowElement.querySelector('.participant-name').addEventListener('mouseout', nameMouseOutHandler);
    return rowElement;
  };

  participants.forEach((participant) => {
    tableElement.querySelector('tbody').insertAdjacentElement('beforeend', getParticipantRow(participant));
  });
};

/**
 * Отрисовывает таблицу без результатов.
 * @param {number} attemptsAmount - количество попыток.
 * @returns {HTMLElement} - элемент таблицы.
 */
const renderEmptyTable = (attemptsAmount) => {
  const tableElement = document.createElement('div');
  tableElement.innerHTML = tableView;
  insertAttempts(tableElement, attemptsAmount);
  insertParticipants(tableElement, attemptsAmount);
  document.body.insertAdjacentElement('afterbegin', tableElement);

  return tableElement;
};

/**
 * Отмечает лучшие показатели в таблице.
 * @param {HTMLElement} tableElement - элемент таблицы.
 * @param {number} attemptsAmount - количество попыток.
 */
const markBest = (tableElement, attemptsAmount) => {
  for (let i = 1; i <= attemptsAmount; i++) {
    const bestResult = Math.max(...Array.from(tableElement.querySelectorAll(`.attempt-${i}`)).map((attemptCell) => attemptCell.innerText));
    Array.from(tableElement.querySelectorAll(`.attempt-${i}`)).map((attemptCell) => {
      if (Number(attemptCell.innerText) === bestResult) {
        attemptCell.classList.add('best');
      }
    });
  }
  const bestScore = Math.max(...Array.from(tableElement.querySelectorAll('.participant-score')).map((attemptCell) => attemptCell.innerText));
  Array.from(tableElement.querySelectorAll('.participant-score')).map((scoreCell) => {
    if (Number(scoreCell.innerText) === bestScore) {
      scoreCell.classList.add('best');
    }
  });
};

/**
 * Заполняет таблицу результатами.
 * @param {HTMLElement} tableElement - элемент таблицы.
 */
const fillTable = (tableElement) => {
  tableElement.querySelectorAll('.participant').forEach((participant) => {
    const participantAttempts = attempts.filter((attempt) => Number(participant.dataset.id) === Number(attempt.id));
    const participantResults = participantAttempts.map((attempt) => attempt.result);
    participant.querySelectorAll('.attempt').forEach((attemptCell, id) => {
      attemptCell.textContent = participantResults[id];
    });
  });
};

/**
 * Заполняет столбец суммы результатов.
 * @param {HTMLElement} tableElement - элемент таблицы.
 */
const calculateScore = (tableElement) => {
  tableElement.querySelectorAll('.participant').forEach((participant) => {
    participant.querySelector('.participant-score').textContent = Array.from(participant.querySelectorAll('.attempt')).reduce((acc, attemptCell) => acc + Number(attemptCell.innerText), 0);
  });
};

const renderErrorMessage = () => {
  const errorMessageElement = document.createElement('div');
  errorMessageElement.classList.add('error-message');
  errorMessageElement.textContent = errorMessage;
  document.body.appendChild(errorMessageElement);
};

const init = async () => {
  try {
    [participants, attempts] = await Promise.all([
      getData(Urls.CARS),
      getData(Urls.ATTEMPTS),
    ]);
  } catch (error) {
    renderErrorMessage();
    return;
  }
  participants = Object.values(participants);
  attempts = Object.values(attempts);
  const attemptsAmount = getAttemptsAmount();

  const tableElement = renderEmptyTable(attemptsAmount);
  fillTable(tableElement);
  calculateScore(tableElement);
  markBest(tableElement, attemptsAmount);
};

// Обработчики

function nameMouseOutHandler() {
  document.querySelector('.modal').remove();
}

function nameMouseOverHandler(evt) {
  const getInnerText = (id) => (
    `<p class="modal__text">${participants[id].city}</p>
    <p class="modal__text">${participants[id].car}</p>`
  );

  const additionalInfoElement = document.createElement('div');
  additionalInfoElement.classList.add('modal');
  additionalInfoElement.style.position = 'absolute';
  additionalInfoElement.style.top = `${evt.target.getBoundingClientRect().top + evt.target.offsetHeight}px`;
  additionalInfoElement.style.left = `${evt.target.getBoundingClientRect().left}px`;
  additionalInfoElement.style.width = `${evt.target.offsetWidth}px`;
  additionalInfoElement.innerHTML = getInnerText(evt.target.parentElement.dataset.id - 1);
  document.body.appendChild(additionalInfoElement);
}

// Точка входа

init();
