const RESULTS_PER_PAGE = 10;
let currentResults = [];
let currentPage = 1;

// Replace or add your real working IDs here
const bookshelfVolumeIds = [
"ev52BgAAQBAJ",
  "DXwkAQAAMAAJ",
  "c9RGBAAAQBAJ"
];

function escapeHtml(text) {
  return $("<div>").text(text || "").html();
}

function createBookCard(item) {
  const volumeInfo = item.volumeInfo || {};
  const title = volumeInfo.title || "No title available";
  const image =
    volumeInfo.imageLinks?.thumbnail ||
    volumeInfo.imageLinks?.smallThumbnail ||
    "";

  return `
    <div class="book-card" data-book-id="${item.id}">
      ${
        image
          ? `<img src="${image}" alt="Cover image for ${escapeHtml(title)}">`
          : `<p>No cover image available.</p>`
      }
      <h3>${escapeHtml(title)}</h3>
    </div>
  `;
}

function renderPage(page) {
  currentPage = page;
  const start = (page - 1) * RESULTS_PER_PAGE;
  const end = start + RESULTS_PER_PAGE;
  const pageItems = currentResults.slice(start, end);

  let html = "";
  pageItems.forEach(item => {
    html += createBookCard(item);
  });

  $("#resultsContainer").html(html || "<p>No items to display.</p>");
  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(currentResults.length / RESULTS_PER_PAGE);
  let html = "";

  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${i === currentPage ? "active" : ""}" data-page="${i}">Page ${i}</button>`;
  }

  $("#pagination").html(html);
}

function loadBookDetails(bookId) {
  $("#detailsContainer").html("<p class='message'>Loading details...</p>");

  $.ajax({
    url: `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(bookId)}`,
    dataType: "jsonp",
    success: function(data) {
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
        ${
          image
            ? `<img src="${image}" alt="Cover image for ${escapeHtml(title)}">`
            : `<p>No cover image available.</p>`
        }
        <h3>${escapeHtml(title)}</h3>
        <p><strong>Authors:</strong> ${escapeHtml(authors)}</p>
        <p><strong>Publisher:</strong> ${escapeHtml(publisher)}</p>
        <p><strong>Price:</strong> ${escapeHtml(price)}</p>
        <p><strong>Description:</strong></p>
        <p>${description}</p>
      `;

      $("#detailsContainer").html(html);
    },
    error: function() {
      $("#detailsContainer").html("<p class='message'>Could not load book details.</p>");
    }
  });
}

function searchBooks() {
  const term = $("#searchInput").val().trim();

  if (!term) {
    $("#statusMessage").text("Please enter a search term.");
    return;
  }

  $("#statusMessage").text("Loading search results...");

  const requests = [
    $.ajax({
      url: `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&startIndex=0&maxResults=20`,
      dataType: "jsonp"
    }),
    $.ajax({
      url: `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&startIndex=20&maxResults=20`,
      dataType: "jsonp"
    }),
    $.ajax({
      url: `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&startIndex=40&maxResults=10`,
      dataType: "jsonp"
    })
  ];

  $.when.apply($, requests)
    .done(function() {
      let combined = [];

      for (let i = 0; i < arguments.length; i++) {
        const response = arguments[i][0];
        if (response.items) {
          combined = combined.concat(response.items);
        }
      }

      currentResults = combined.slice(0, 50);

      if (!currentResults.length) {
        $("#statusMessage").text("No books found.");
        $("#resultsContainer").html("");
        $("#pagination").html("");
        return;
      }

      $("#statusMessage").text(`Showing ${currentResults.length} results in 5 page views.`);
      renderPage(1);
    })
    .fail(function() {
      $("#statusMessage").text("Could not load search results.");
    });
}

function loadBookshelf() {
  $("#statusMessage").text("Loading books from your public bookshelf...");

  const requests = bookshelfVolumeIds.map(id =>
    $.ajax({
      url: `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(id)}`,
      dataType: "jsonp"
    })
  );

  $.when.apply($, requests)
    .done(function() {
      let books = [];

      for (let i = 0; i < arguments.length; i++) {
        const response = arguments[i][0];
        if (response && response.id) {
          books.push(response);
        }
      }

      currentResults = books;

      if (!currentResults.length) {
        $("#statusMessage").text("No bookshelf books could be loaded.");
        $("#resultsContainer").html("");
        $("#pagination").html("");
        return;
      }

      $("#statusMessage").text("Showing books from your public bookshelf.");
      renderPage(1);
    })
    .fail(function() {
      $("#statusMessage").text("Could not load bookshelf books.");
    });
}

$(document).ready(function() {
  $("#searchBtn").on("click", searchBooks);

  $("#showBookshelfBtn").on("click", loadBookshelf);

  $("#pagination").on("click", "button", function() {
    const page = Number($(this).data("page"));
    renderPage(page);
  });

  $("#resultsContainer").on("click", ".book-card", function() {
    const bookId = $(this).data("book-id");
    loadBookDetails(bookId);
  });
});
