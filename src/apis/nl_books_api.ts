import { Book } from '@models/book.model';
import { BaseBooksApiImpl } from './base_api';
import { requestUrl } from 'obsidian';

interface NLBooksApiOptions {
  key: string;
}

interface NLBooksResponse {
  total: number;
  items: Array<{
    titleInfo: string;
    authorInfo: string;
    pubInfo: string;
    isbn: string;
    description: string;
    coverUrl: string;
    publishYear: string;
  }>;
}

export class NLBooksApi implements BaseBooksApiImpl {
  private apiKey: string;
  private baseUrl = 'https://nl.go.kr/NL/search/openApi/search.do';

  constructor(options: NLBooksApiOptions) {
    this.apiKey = options.key;
  }

  async getByQuery(query: string, options?: { locale?: string }): Promise<Book[]> {
    try {
      const response = await requestUrl({
        url: `${this.baseUrl}?key=${this.apiKey}&kwd=${encodeURIComponent(query)}&apiType=json`,
        method: 'GET',
      });

      const data = response.json as NLBooksResponse;
      
      return data.items.map((item) => ({
        title: item.titleInfo,
        author: item.authorInfo,
        authors: [item.authorInfo],
        publisher: item.pubInfo,
        isbn: item.isbn,
        description: item.description,
        coverUrl: item.coverUrl,
        publishDate: item.publishYear,
        link: `https://nl.go.kr/NL/search/detail/${item.isbn}`,
      }));
    } catch (error) {
      console.error('Error fetching data from NL API:', error);
      throw new Error('국립중앙도서관 API 검색 중 오류가 발생했습니다.');
    }
  }

  async getByIsbn(isbn: string): Promise<Book> {
    return this.getByQuery(isbn).then((books) => {
      const book = books.find((b) => b.isbn === isbn);
      if (!book) throw new Error(`ISBN ${isbn}에 해당하는 도서를 찾을 수 없습니다.`);
      return book;
    });
  }
} 