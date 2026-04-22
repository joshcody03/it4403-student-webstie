const RESULTS_PER_PAGE = 10;
let allSearchResults = [];
let allBookshelfResults = [];
let activeData = [];
let currentPage = 1;
let currentView = "grid";
let currentMode = "search";

// Use your working IDs here
const bookshelfVolumeIds = [
  "ev52BgAAQBAJ",
  "DXwkAQAAMAAJ",
  "c9RGBAAAQBAJ"
];

function getGoogleBooksData(url) {
  return $.ajax({
    url: url,
    dataType: "jsonp"
  });
}

function escapeText(text) {
  return text || "Not available";
}

function mapBookData(item) {
  const volumeInfo = item.volumeInfo || {};
  const saleInfo = item.saleInfo || {};

  return {
    id: item.id || "",
    title: escapeText(volumeInfo.title),
    authors: volumeInfo.authors ? volumeInfo.authors.join(", ") : "Not available",
    publisher: volumeInfo.publisher || "",
    description: volumeInfo.description || "No description available.",
    image:
      volumeInfo.imageLinks?.thumbnail ||
      volumeInfo.imageLinks?.smallThumbnail ||
      "",
    language: escapeText(volumeInfo.language),
    pageCount: volumeInfo.pageCount || "Not available",
    categories: volumeInfo.categories ? volumeInfo.categories.join(", ") : "Not available",
    publishedDate: escapeText(volumeInfo.publishedDate),
    price: saleInfo.listPrice
      ? `${saleInfo.listPrice.amount} ${saleInfo.listPrice.currencyCode}`
      : "Not available"
  };
}

function renderResults() {
  const start = (currentPage - 1) * RESULTS_PER_PAGE;
  const end = start + RESULTS_PER_PAGE;
  const pageItems = activeData.slice(start, end);

  const template = $("#book-card-template").html();
  let html = "";

  pageItems.forEach(item => {
    const mapped = mapBookData(item);
    mapped.viewClass = currentView;
    html += Mustache.render(template, mapped);
  });

  $("#resultsContainer")
    .removeClass("results-grid results-list")
    .addClass(currentView === "grid" ? "results-grid" : "results-list")
    .html(html || "<p class='message'>No items to display.</p>");

  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(activeData.length / RESULTS_PER_PAGE);
  let html = "";

  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${i === currentPage ? "active-page" : ""}" data-page="${i}">${i}</button>`;
  }

  $("#pagination").html(html);
}

function renderDetails(item) {
  const template = $("#details-template").html();
  const mapped = mapBookData(item);
  const html = Mustache.render(template, mapped);
  $("#detailsContainer").html(html);
}

function searchBooks() {
  const term = $("#searchInput").val().trim();

  if (!term) {
    $("#statusMessage").text("Please enter a search term.");
    return;
  }

  currentMode = "search";
  $("#resultsHeading").text("Search Results");
  $("#statusMessage").text("Loading search results...");
  $("#resultsContainer").html("");
  $("#pagination").html("");
  $("#detailsContainer").html("<p class='message'>Click a book to see details here.</p>");

  const requests = [
    getGoogleBooksData(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&startIndex=0&maxResults=20`),
    getGoogleBooksData(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&startIndex=20&maxResults=20`),
    getGoogleBooksData(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&startIndex=40&maxResults=10`)
  ];

  $.when.apply($, requests)
    .done(function () {
      let combined = [];

      for (let i = 0; i < arguments.length; i++) {
        const response = arguments[i][0];
        if (response && response.items) {
          combined = combined.concat(response.items);
        }
      }

      allSearchResults = combined.slice(0, 50);
      activeData = allSearchResults;
      currentPage = 1;

      if (!activeData.length) {
        $("#statusMessage").text("No books found.");
        $("#resultsContainer").html("");
        $("#pagination").html("");
        return;
      }

      $("#statusMessage").text(`Showing ${activeData.length} search results.`);
      renderResults();
    })
    .fail(function () {
      $("#statusMessage").text("Could not load search results.");
    });
}

function loadBookshelf() {
  currentMode = "bookshelf";
  $("#resultsHeading").text("My Bookshelf");
  $("#statusMessage").text("Loading books from your public bookshelf...");
  $("#resultsContainer").html("");
  $("#pagination").html("");
  $("#detailsContainer").html("<p class='message'>Click a book to see details here.</p>");

  const requests = bookshelfVolumeIds.map(id =>
    getGoogleBooksData(`https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(id)}`)
  );

  $.when.apply($, requests)
    .done(function () {
      let books = [];

      for (let i = 0; i < arguments.length; i++) {
        const response = arguments[i][0];
        if (response && response.id) {
          books.push(response);
        }
      }

      allBookshelfResults = books;
      activeData = allBookshelfResults;
      currentPage = 1;

      if (!activeData.length) {
        $("#statusMessage").text("No bookshelf books could be loaded.");
        $("#resultsContainer").html("");
        $("#pagination").html("");
        return;
      }

      $("#statusMessage").text("Showing books from your public bookshelf.");
      renderResults();
    })
    .fail(function () {
      $("#statusMessage").text("Could not load bookshelf books.");
    });
}

function loadBookDetails(bookId) {
  $("#detailsContainer").html("<p class='message'>Loading details...</p>");

  getGoogleBooksData(`https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(bookId)}`)
    .done(function (data) {
      renderDetails(data);
    })
    .fail(function () {
      $("#detailsContainer").html("<p class='message'>Could not load book details.</p>");
    });
}

$(document).ready(function () {
  $("#searchBtn").on("click", searchBooks);
  $("#showBookshelfBtn").on("click", loadBookshelf);

  $("#gridViewBtn").on("click", function () {
    currentView = "grid";
    $("#gridViewBtn").addClass("active-view");
    $("#listViewBtn").removeClass("active-view");
    renderResults();
  });

  $("#listViewBtn").on("click", function () {
    currentView = "list";
    $("#listViewBtn").addClass("active-view");
    $("#gridViewBtn").removeClass("active-view");
    renderResults();
  });

  $("#pagination").on("click", "button", function () {
    currentPage = Number($(this).data("page"));
    renderResults();
  });

  $("#resultsContainer").on("click", ".book-card", function () {
    const bookId = $(this).data("book-id");
    loadBookDetails(bookId);
  });
});
