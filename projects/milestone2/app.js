const RESULTS_PER_PAGE = 10;
let allBooks = [];


const bookshelfVolumeIds = [
  "ev52BgAAQBAJ",
  "DXwkAQAAMAAJ",
  "c9RGBAAAQBAJ",
  
];

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function escapeHtml(text) {
  return $("<div>").text(text || "").html();
}

function createBookCard(item) {
  const volumeInfo = item.volumeInfo || {};
  const image = volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || "";
  const title = volumeInfo.title || "No title available";

  return `
    <div class="book-card">
      ${image ? `<img src="${image}" alt="Cover image for ${escapeHtml(title)}">` : `<p>No cover image available.</p>`}
      <h3>
        <a href="details.html?id=${encodeURIComponent(item.id)}">${escapeHtml(title)}</a>
      </h3>
    </div>
  `;
}

function renderSearchPage(books, pageNumber = 1) {
  const start = (pageNumber - 1) * RESULTS_PER_PAGE;
  const end = start + RESULTS_PER_PAGE;
  const currentPageBooks = books.slice(start, end);

  let html = "";
  currentPageBooks.forEach(book => {
    html += createBookCard(book);
  });

  $("#searchResults").html(html || "<p>No results found.</p>");
}

function buildPageDropdown(totalBooks) {
  const totalPages = Math.ceil(totalBooks / RESULTS_PER_PAGE);
  let options = "";

  for (let i = 1; i <= totalPages; i++) {
    options += `<option value="${i}">Page ${i}</option>`;
  }

  $("#pageSelect").html(options);
}

function searchBooks() {
  const term = $("#searchInput").val().trim();

  if (!term) {
    $("#statusMessage").text("Please enter a search term.");
    $("#searchResults").empty();
    $("#pageSelect").empty();
    return;
  }

  $("#statusMessage").text("Loading search results...");
  $("#searchResults").empty();
  $("#pageSelect").empty();

  // Get up to 60 results by making 3 requests of 20 each
  const urls = [
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&startIndex=0&maxResults=20`,
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&startIndex=20&maxResults=20`,
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&startIndex=40&maxResults=20`
  ];

  Promise.all(urls.map(url => $.getJSON(url)))
    .then(responses => {
      allBooks = [];

      responses.forEach(response => {
        if (response.items) {
          allBooks = allBooks.concat(response.items);
        }
      });

      allBooks = allBooks.slice(0, 60);

      if (!allBooks.length) {
        $("#statusMessage").text("No books found.");
        $("#searchResults").empty();
        return;
      }

      $("#statusMessage").text(`Showing up to ${allBooks.length} results.`);
      buildPageDropdown(allBooks.length);
      renderSearchPage(allBooks, 1);
    })
    .catch(() => {
      $("#statusMessage").text("Could not load search results from the Google Books API.");
    });
}

function loadBookDetails() {
  const bookId = getQueryParam("id");

  if (!bookId) {
    $("#detailsContainer").html("<p class='message'>No book ID was provided.</p>");
    return;
  }

  const url = `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(bookId)}`;

  $.getJSON(url, function(data) {
    const volumeInfo = data.volumeInfo || {};
    const saleInfo = data.saleInfo || {};

    const title = volumeInfo.title || "No title available";
    const authors = volumeInfo.authors ? volumeInfo.authors.join(", ") : "Not available";
    const publisher = volumeInfo.publisher || "Not available";
    const description = volumeInfo.description || "No description available";
    const image =
      volumeInfo.imageLinks?.thumbnail ||
      volumeInfo.imageLinks?.small ||
      volumeInfo.imageLinks?.smallThumbnail ||
      "";
    const price = saleInfo.listPrice
      ? `${saleInfo.listPrice.amount} ${saleInfo.listPrice.currencyCode}`
      : "Not available";

    const html = `
      <div class="details-layout">
        <div>
          ${image ? `<img src="${image}" alt="Cover image for ${escapeHtml(title)}">` : `<p>No cover image available.</p>`}
        </div>
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p><strong>Authors:</strong> ${escapeHtml(authors)}</p>
          <p><strong>Publisher:</strong> ${escapeHtml(publisher)}</p>
          <p><strong>Price:</strong> <span class="price">${escapeHtml(price)}</span></p>
          <p><strong>Description:</strong></p>
          <p>${description}</p>
        </div>
      </div>
    `;

    $("#detailsContainer").html(html);
  }).fail(function() {
    $("#detailsContainer").html("<p class='message'>Could not load book details.</p>");
  });
}

function loadBookshelf() {
  if (!bookshelfVolumeIds.length) {
    $("#bookshelfMessage").text("No bookshelf book IDs have been added yet.");
    return;
  }

  $("#bookshelfMessage").text("Loading bookshelf books...");

  const requests = bookshelfVolumeIds.map(id =>
    $.getJSON(`https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(id)}`)
      .then(book => book)
      .catch(() => null)
  );

  Promise.all(requests)
    .then(results => {
      let html = "";
      const validBooks = results.filter(book => book !== null);

      validBooks.forEach(book => {
        html += createBookCard(book);
      });

      if (!validBooks.length) {
        $("#bookshelfMessage").text("No valid bookshelf books could be loaded.");
        $("#bookshelfResults").html("");
        return;
      }

      $("#bookshelfMessage").text("Books from my public bookshelf.");
      $("#bookshelfResults").html(html);
    })
    .catch(() => {
      $("#bookshelfMessage").text("Could not load bookshelf books.");
    });
}
$(document).ready(function() {
  const page = window.location.pathname;

  if (page.endsWith("/index.html") || page.endsWith("/milestone2/")) {
    $("#searchBtn").on("click", searchBooks);

    $("#pageSelect").on("change", function() {
      const selectedPage = Number($(this).val());
      renderSearchPage(allBooks, selectedPage);
    });
  }

  if (page.endsWith("/details.html")) {
    loadBookDetails();
  }

  if (page.endsWith("/bookshelf.html")) {
    loadBookshelf();
  }
});
