using Google.Apis.Services;
using Google.Apis.Urlshortener.v1;
using Google.Apis.Urlshortener.v1.Data;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Web;
using System.Web.Mvc;
using System.Web.Script.Serialization;

namespace Dev_Research.Controllers
{
    public class HomeController : Controller
    {
        private static UrlshortenerService service;

        public ActionResult Index()
        {
            return View();
        }

        public ActionResult About()
        {
            ViewBag.Message = "Your application description page.";

            return View();
        }

        public ActionResult Contact()
        {
            ViewBag.Message = "Your contact page.";

            return View();
        }

        public string Url()
        {
            var toShorten = "https://eventclinics.tara.rodbourn.com";
            string shortUrl = "";
            if (toShorten.Any())
            {

                // If we did not construct the service so far, do it now.

                BaseClientService.Initializer initializer = new BaseClientService.Initializer();
                initializer.ApiKey = "AIzaSyAu6FKNhOOuaGkhqbMNou-AoQSNj6oJOoo";
                service = new UrlshortenerService(initializer);

                var fullUrl = toShorten;

                // Shorten the URL by inserting a new Url.
                var toInsert = new Url { LongUrl = fullUrl };

                try
                {
                    toInsert = service.Url.Insert(toInsert).Execute();
                    var urlShortenerResult = toInsert.Id;

                    shortUrl = urlShortenerResult;
                }
                catch (Exception ex)
                {
                    // on fail use long url

                    shortUrl = fullUrl;
                }


            }

            return shortUrl;
        }

        public String Short()
        {
            string longurl = "https://eventclinics.tara.rodbourn.com/";
            string googReturnedJson = string.Empty;
            JavaScriptSerializer javascriptSerializer = new JavaScriptSerializer();

            GoogleShortenedURLRequest googSentJson = new GoogleShortenedURLRequest();
            googSentJson.longUrl = longurl;
            string jsonData = javascriptSerializer.Serialize(googSentJson);

            byte[] bytebuffer = Encoding.UTF8.GetBytes(jsonData);

            WebRequest webreq = WebRequest.Create("https://www.googleapis.com/urlshortener/v1/url");
            webreq.Method = WebRequestMethods.Http.Post;
            webreq.ContentLength = bytebuffer.Length;
            webreq.ContentType = "application/json";

            webreq.UseDefaultCredentials = true;
            //webreq.Timeout = 4000;
            webreq.Proxy.Credentials = System.Net.CredentialCache.DefaultCredentials;
            

            using (Stream stream = webreq.GetRequestStream())
            {
                stream.Write(bytebuffer, 0, bytebuffer.Length);
                stream.Close();
            }

            using (HttpWebResponse webresp = (HttpWebResponse)webreq.GetResponse())
            {
                using (Stream dataStream = webresp.GetResponseStream())
                {
                    using (StreamReader reader = new StreamReader(dataStream))
                    {
                        googReturnedJson = reader.ReadToEnd();
                    }
                }
            }

            GoogleShortenedURLResponse googUrl = javascriptSerializer.Deserialize<GoogleShortenedURLResponse>(googReturnedJson);

            ViewBag.ShortenedUrl = googUrl.id;

            return googUrl.id.ToString();
        }

        public ActionResult Check()
        {
            return View();
        }


        private class GoogleShortenedURLResponse
        {
            public string id { get; set; }
            public string kind { get; set; }
            public string longUrl { get; set; }
        }

        private class GoogleShortenedURLRequest
        {
            public string longUrl { get; set; }
        }
    }
}