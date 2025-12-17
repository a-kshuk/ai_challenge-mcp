export class WeatherService {
  private createUrl(city: string) {
    return `https://openweathermap.org/data/2.5/find?q=${encodeURI(
      city
    )}&appid=${process.env.OPEN_WEATHER_KEY ?? ""}`;
  }

  async getWeather(city: string): Promise<string> {
    const url = this.createUrl(city);
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return JSON.stringify(data);
    } else {
      throw response;
    }
  }
}
