import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  ChevronLeft, Download, Share2, Upload, Type,
  Palette, Image as ImageIcon, Sparkles, Laugh,
  Grid3x3, RefreshCw, AlignCenter, Shuffle, Wand2, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const memeTemplates = [
  // CLASSIC MEMES
  { id: "drake", name: "Drake Hotline Bling", url: "https://i.imgflip.com/30b1gx.jpg", topText: "Eating pizza with a fork", bottomText: "Eating pizza with your hands", category: "classic" },
  { id: "distracted", name: "Distracted Boyfriend", url: "https://i.imgflip.com/1ur9b0.jpg", topText: "Working on important project", bottomText: "Scrolling memes instead", category: "classic" },
  { id: "success", name: "Success Kid", url: "https://i.imgflip.com/1bhk.jpg", topText: "Found my keys", bottomText: "In my pocket the whole time", category: "classic" },
  { id: "fry", name: "Futurama Fry", url: "https://i.imgflip.com/1bgw.jpg", topText: "Not sure if hungry", bottomText: "Or just bored", category: "classic" },
  { id: "doge", name: "Doge", url: "https://i.imgflip.com/4t0m5.jpg", topText: "Such wow", bottomText: "Much meme. Very funny", category: "classic" },
  { id: "bernie", name: "Bernie Sanders", url: "https://i.imgflip.com/4x6d.jpg", topText: "I am once again asking", bottomText: "For weekend to come faster", category: "classic" },
  { id: "bad_luck", name: "Bad Luck Brian", url: "https://i.imgflip.com/1bip.jpg", topText: "Finally gets a date", bottomText: "With his dentist", category: "classic" },
  { id: "overly_attached", name: "Overly Attached GF", url: "https://i.imgflip.com/1biy.jpg", topText: "I saw you online", bottomText: "Why didn't you text back in 2 seconds?", category: "classic" },
  { id: "scumbag", name: "Scumbag Steve", url: "https://i.imgflip.com/1bir.jpg", topText: "Borrows your charger", bottomText: "Never returns it", category: "classic" },
  { id: "good_guy", name: "Good Guy Greg", url: "https://i.imgflip.com/1bil.jpg", topText: "Sees you're having bad day", bottomText: "Buys you lunch", category: "classic" },
  
  // SMART/GENIUS MEMES
  { id: "brain", name: "Expanding Brain", url: "https://i.imgflip.com/1jwhww.jpg", topText: "Reading documentation", bottomText: "Stack overflow everything", category: "smart" },
  { id: "thinking", name: "Roll Safe", url: "https://i.imgflip.com/1h7in3.jpg", topText: "Can't fail the test", bottomText: "If you don't take it", category: "smart" },
  { id: "galaxy_brain", name: "Galaxy Brain", url: "https://i.imgflip.com/1jwhww.jpg", topText: "Normal thinking", bottomText: "Genius thinking", category: "smart" },
  { id: "philosoraptor", name: "Philosoraptor", url: "https://i.imgflip.com/1bgs.jpg", topText: "If nothing is impossible", bottomText: "Then is it possible for something to be impossible?", category: "smart" },
  { id: "math_lady", name: "Math Lady", url: "https://i.imgflip.com/gjk44.jpg", topText: "Trying to calculate", bottomText: "How much money I wasted", category: "smart" },
  { id: "einstein", name: "Einstein", url: "https://i.imgflip.com/3oevdk.jpg", topText: "Big brain time", bottomText: "It's all coming together", category: "smart" },
  { id: "brain_sizes", name: "Brain Sizes", url: "https://i.imgflip.com/2h7bvd.jpg", topText: "Small brain ideas", bottomText: "Big brain solutions", category: "smart" },
  { id: "genius_dog", name: "Genius Dog", url: "https://i.imgflip.com/2oor13.jpg", topText: "When you figure out", bottomText: "The answer is 42", category: "smart" },
  { id: "iq_bell", name: "IQ Bell Curve", url: "https://i.imgflip.com/3sane0.jpg", topText: "Average intelligence", bottomText: "Peak intelligence same answer", category: "smart" },
  { id: "smart_guy", name: "Smart Guy", url: "https://i.imgflip.com/4ke8ef.jpg", topText: "Actually...", bottomText: "According to my calculations", category: "smart" },
  
  // SCARY/HORROR MEMES
  { id: "friday_13", name: "Friday the 13th", url: "https://i.imgflip.com/w8h0l.jpg", topText: "Walking alone at night", bottomText: "Hearing footsteps behind you", category: "scary" },
  { id: "haunted", name: "Haunted House", url: "https://i.imgflip.com/5c7lwq.jpg", topText: "Ghost hunters: Let's split up", bottomText: "Horror movie logic", category: "scary" },
  { id: "creepy", name: "Creepy Smile", url: "https://i.imgflip.com/5kf7v.jpg", topText: "When you hear a noise", bottomText: "But you live alone", category: "scary" },
  { id: "shadow", name: "Shadow Figure", url: "https://i.imgflip.com/3oq7mu.jpg", topText: "Sleep paralysis demon", bottomText: "Standing in corner at 3am", category: "scary" },
  { id: "dark_corridor", name: "Dark Hallway", url: "https://i.imgflip.com/5gipc9.jpg", topText: "Me at 3am getting water", bottomText: "Every shadow is a monster", category: "scary" },
  { id: "scary_face", name: "Scary Face", url: "https://i.imgflip.com/4acd7.jpg", topText: "POV: You looked in mirror", bottomText: "At 3am after watching horror movie", category: "scary" },
  { id: "demon", name: "Sleep Demon", url: "https://i.imgflip.com/5ot91h.jpg", topText: "My sleep paralysis demon", bottomText: "Judging my life choices", category: "scary" },
  { id: "horror_protagonist", name: "Horror Protagonist", url: "https://i.imgflip.com/4nqy0h.jpg", topText: "Hears demonic screaming", bottomText: "Goes to investigate alone", category: "scary" },
  
  // MOTIVATIONAL MEMES
  { id: "shia", name: "Shia Just Do It", url: "https://i.imgflip.com/gfgc4.jpg", topText: "Don't let your dreams be dreams", bottomText: "JUST DO IT!", category: "motivational" },
  { id: "yes_you_can", name: "Yes You Can", url: "https://i.imgflip.com/39w74y.jpg", topText: "Believe in yourself", bottomText: "You got this!", category: "motivational" },
  { id: "keep_going", name: "Keep Going", url: "https://i.imgflip.com/4kc4pe.jpg", topText: "When you want to give up", bottomText: "Remember why you started", category: "motivational" },
  { id: "strong", name: "You Are Strong", url: "https://i.imgflip.com/2fm6x.jpg", topText: "Struggled today?", bottomText: "You survived. That's winning.", category: "motivational" },
  { id: "progress", name: "Progress", url: "https://i.imgflip.com/30hy6l.jpg", topText: "Small progress", bottomText: "Is still progress", category: "motivational" },
  { id: "never_give_up", name: "Never Give Up", url: "https://i.imgflip.com/3edvul.jpg", topText: "Fall down seven times", bottomText: "Stand up eight", category: "motivational" },
  { id: "believe", name: "Believe", url: "https://i.imgflip.com/2wq4h.jpg", topText: "The only limit", bottomText: "Is the one you set yourself", category: "motivational" },
  { id: "grind", name: "The Grind", url: "https://i.imgflip.com/5c94v7.jpg", topText: "Success doesn't come from comfort zones", bottomText: "Keep grinding", category: "motivational" },
  
  // REACTION MEMES
  { id: "woman", name: "Woman Yelling at Cat", url: "https://i.imgflip.com/345v97.jpg", topText: "You need to wake up early!", bottomText: "But sleep is amazing tho", category: "reaction" },
  { id: "ralph", name: "I'm In Danger", url: "https://i.imgflip.com/2wifvo.jpg", topText: "Deadline is tomorrow", bottomText: "Haven't started yet", category: "reaction" },
  { id: "batman", name: "Batman Slapping Robin", url: "https://i.imgflip.com/9ehk.jpg", topText: "I'm gonna say something dumb", bottomText: "Not on my watch", category: "reaction" },
  { id: "pepe", name: "Sad Frog", url: "https://i.imgflip.com/1e7ql7.jpg", topText: "When you realize", bottomText: "It's Monday tomorrow", category: "reaction" },
  { id: "puppet", name: "Puppet Side Eye", url: "https://i.imgflip.com/3pnmg.jpg", topText: "Them: You can't judge me", bottomText: "Me: *judges in silence*", category: "reaction" },
  { id: "hide", name: "Hide the Pain Harold", url: "https://i.imgflip.com/gk5el.jpg", topText: "Everything is fine", bottomText: "I'm not dying inside at all", category: "reaction" },
  { id: "panik", name: "Panik Kalm", url: "https://i.imgflip.com/3qqcim.jpg", topText: "Forgot homework - PANIK", bottomText: "Remember no school today - KALM", category: "reaction" },
  { id: "surprised_pikachu", name: "Surprised Pikachu", url: "https://i.imgflip.com/2zh47u.jpg", topText: "Did nothing all semester", bottomText: "*fails exam* :O", category: "reaction" },
  { id: "shocked_face", name: "Shocked Face", url: "https://i.imgflip.com/2hgfw.jpg", topText: "When they actually", bottomText: "Read the terms and conditions", category: "reaction" },
  { id: "michael_scott", name: "Michael Scott NO", url: "https://i.imgflip.com/5x6hx.jpg", topText: "Please no", bottomText: "God please no. NO!", category: "reaction" },
  { id: "dramatic_look", name: "Dramatic Look", url: "https://i.imgflip.com/32xck8.jpg", topText: "When someone says", bottomText: "I don't like memes", category: "reaction" },
  { id: "crying_cat", name: "Crying Cat", url: "https://i.imgflip.com/5c7lwq.jpg", topText: "Me after watching", bottomText: "One sad scene in a movie", category: "reaction" },
  { id: "angry_baby", name: "Angry Baby", url: "https://i.imgflip.com/6yz5.jpg", topText: "When someone eats", bottomText: "The food I was saving", category: "reaction" },
  { id: "shocked_tom", name: "Shocked Tom", url: "https://i.imgflip.com/2ybua0.jpg", topText: "Teachers giving homework", bottomText: "On the last day of school", category: "reaction" },
  { id: "monkey_puppet", name: "Awkward Monkey", url: "https://i.imgflip.com/3lmzyx.jpg", topText: "When you wave at someone", bottomText: "And they weren't waving at you", category: "reaction" },
  
  // CHAOS/DISASTER MEMES
  { id: "disaster", name: "Disaster Girl", url: "https://i.imgflip.com/2od.jpg", topText: "Accidentally liked their post", bottomText: "From 3 years ago", category: "chaos" },
  { id: "burning_house", name: "This Is Fine", url: "https://i.imgflip.com/wxica.jpg", topText: "Everything's on fire", bottomText: "This is fine", category: "chaos" },
  { id: "explosion", name: "Explosion", url: "https://i.imgflip.com/3si4.jpg", topText: "My life going smoothly", bottomText: "*one small problem appears*", category: "chaos" },
  { id: "train_wreck", name: "Train Wreck", url: "https://i.imgflip.com/3oot5z.jpg", topText: "My plans for 2024", bottomText: "What actually happened", category: "chaos" },
  { id: "falling", name: "Falling", url: "https://i.imgflip.com/5bnb3q.jpg", topText: "My mental stability", bottomText: "After one minor inconvenience", category: "chaos" },
  { id: "destruction", name: "Destruction", url: "https://i.imgflip.com/4w1gq7.jpg", topText: "Me trying to fix", bottomText: "One small bug in my code", category: "chaos" },
  
  // WHOLESOME MEMES
  { id: "wholesome_seal", name: "Wholesome Seal", url: "https://i.imgflip.com/2dd3kz.jpg", topText: "When someone compliments you", bottomText: "And you actually believe them", category: "wholesome" },
  { id: "happy_dog", name: "Happy Dog", url: "https://i.imgflip.com/3cu5.jpg", topText: "Good morning!", bottomText: "You're amazing and loved", category: "wholesome" },
  { id: "cute_cat", name: "Smiling Cat", url: "https://i.imgflip.com/4acd7.jpg", topText: "Remember", bottomText: "You're doing great", category: "wholesome" },
  { id: "proud", name: "Proud", url: "https://i.imgflip.com/2fm6x.jpg", topText: "I'm proud of you", bottomText: "For trying your best", category: "wholesome" },
  { id: "support", name: "Supportive Friend", url: "https://i.imgflip.com/30b1gx.jpg", topText: "No matter what", bottomText: "I got your back", category: "wholesome" },
  { id: "friendship", name: "True Friendship", url: "https://i.imgflip.com/3si4.jpg", topText: "Real friends", bottomText: "Support each other's dreams", category: "wholesome" },
  { id: "grateful", name: "Be Grateful", url: "https://i.imgflip.com/4kc4pe.jpg", topText: "Today I'm grateful for", bottomText: "The little things", category: "wholesome" },
  { id: "love", name: "Spread Love", url: "https://i.imgflip.com/39w74y.jpg", topText: "In a world where you can be anything", bottomText: "Be kind", category: "wholesome" },
  
  // GAMING MEMES
  { id: "rage_quit", name: "Rage Quit", url: "https://i.imgflip.com/2i0.jpg", topText: "When you die to the boss", bottomText: "For the 47th time", category: "gaming" },
  { id: "gamer_rage", name: "Gamer Rage", url: "https://i.imgflip.com/415yvx.jpg", topText: "It's just a game", bottomText: "JUST A GAME?!", category: "gaming" },
  { id: "respawn", name: "Respawn", url: "https://i.imgflip.com/4kzu0w.jpg", topText: "Dies in game", bottomText: "One more try", category: "gaming" },
  { id: "lag", name: "Lag", url: "https://i.imgflip.com/5gipc9.jpg", topText: "About to win", bottomText: "*connection lost*", category: "gaming" },
  { id: "noob", name: "Pro vs Noob", url: "https://i.imgflip.com/3oq7mu.jpg", topText: "Pro gamers", bottomText: "Me button mashing", category: "gaming" },
  { id: "backlog", name: "Game Backlog", url: "https://i.imgflip.com/2wq4h.jpg", topText: "500 unplayed games", bottomText: "Buys another game on sale", category: "gaming" },
  { id: "toxic", name: "Toxic Gamer", url: "https://i.imgflip.com/1bil.jpg", topText: "Loses one match", bottomText: "Everyone else is trash", category: "gaming" },
  { id: "afk", name: "AFK Player", url: "https://i.imgflip.com/5c94v7.jpg", topText: "Team needs me", bottomText: "But snack time", category: "gaming" },
  
  // WORK/OFFICE MEMES
  { id: "monday", name: "Monday Morning", url: "https://i.imgflip.com/1e7ql7.jpg", topText: "Weekend", bottomText: "Monday morning", category: "work" },
  { id: "meeting", name: "Useless Meeting", url: "https://i.imgflip.com/1bij.jpg", topText: "This meeting", bottomText: "Could've been an email", category: "work" },
  { id: "boss", name: "Boss vs Employee", url: "https://i.imgflip.com/2fm6x.jpg", topText: "Boss: Why aren't you smiling?", bottomText: "Me: You don't pay me to smile", category: "work" },
  { id: "deadline", name: "Deadline", url: "https://i.imgflip.com/2wifvo.jpg", topText: "Deadline in 1 hour", bottomText: "Just starting now", category: "work" },
  { id: "remote_work", name: "Work From Home", url: "https://i.imgflip.com/gk5el.jpg", topText: "Professional on Zoom", bottomText: "Pajamas below the camera", category: "work" },
  { id: "coffee", name: "Coffee Addiction", url: "https://i.imgflip.com/wxica.jpg", topText: "Running on 3 hours sleep", bottomText: "And 5 cups of coffee", category: "work" },
  { id: "friday", name: "Friday Feeling", url: "https://i.imgflip.com/14wx.jpg", topText: "When it's finally Friday", bottomText: "And you survived the week", category: "work" },
  { id: "coworker", name: "Annoying Coworker", url: "https://i.imgflip.com/1biy.jpg", topText: "Coworker talks about weekend", bottomText: "For 3 hours straight", category: "work" },
  { id: "promotion", name: "No Promotion", url: "https://i.imgflip.com/1bip.jpg", topText: "Works extra hard all year", bottomText: "Gets 2% raise", category: "work" },
  { id: "burnout", name: "Burnout", url: "https://i.imgflip.com/2hgfw.jpg", topText: "Me after 5 zoom calls", bottomText: "Back to back", category: "work" },
  
  // RELATIONSHIP MEMES
  { id: "couple_goals", name: "Couple Goals", url: "https://i.imgflip.com/1ur9b0.jpg", topText: "My relationship goals", bottomText: "Pizza and Netflix", category: "relationship" },
  { id: "single", name: "Single Life", url: "https://i.imgflip.com/1e7ql7.jpg", topText: "Being single", bottomText: "More money for myself", category: "relationship" },
  { id: "first_date", name: "First Date", url: "https://i.imgflip.com/1bgw.jpg", topText: "On first date", bottomText: "Act normal. Act normal.", category: "relationship" },
  { id: "breakup", name: "After Breakup", url: "https://i.imgflip.com/4acd7.jpg", topText: "After breakup", bottomText: "Delete gym, hit lawyer, Facebook up", category: "relationship" },
  { id: "crush", name: "Talking to Crush", url: "https://i.imgflip.com/2ybua0.jpg", topText: "Brain: Say something cool", bottomText: "Me: So you like...stuff?", category: "relationship" },
  { id: "ex", name: "Seeing Ex", url: "https://i.imgflip.com/3lmzyx.jpg", topText: "When you see your ex", bottomText: "Looking happy", category: "relationship" },
  
  // FOOD MEMES
  { id: "pizza", name: "Pizza Time", url: "https://i.imgflip.com/30b1gx.jpg", topText: "Eating healthy", bottomText: "Pizza for every meal", category: "food" },
  { id: "hungry", name: "Always Hungry", url: "https://i.imgflip.com/1bgw.jpg", topText: "Just ate", bottomText: "Hungry again", category: "food" },
  { id: "diet", name: "Diet Failed", url: "https://i.imgflip.com/1jwhww.jpg", topText: "Starting diet tomorrow", bottomText: "Eats entire cake tonight", category: "food" },
  { id: "cooking", name: "Cooking Disaster", url: "https://i.imgflip.com/2od.jpg", topText: "Following recipe", bottomText: "Created abomination", category: "food" },
  { id: "takeout", name: "Takeout Again", url: "https://i.imgflip.com/gk5el.jpg", topText: "Groceries in fridge", bottomText: "Orders takeout anyway", category: "food" },
  { id: "midnight_snack", name: "Midnight Snack", url: "https://i.imgflip.com/3qqcim.jpg", topText: "3am", bottomText: "Time for a snack", category: "food" },
  
  // ANIMAL MEMES
  { id: "grumpy_cat", name: "Grumpy Cat", url: "https://i.imgflip.com/30b1gx.jpg", topText: "Morning person?", bottomText: "I don't think so", category: "animal" },
  { id: "dog_fire", name: "Dog in Fire", url: "https://i.imgflip.com/wxica.jpg", topText: "Everything is fine", bottomText: "Totally under control", category: "animal" },
  { id: "seal", name: "Awkward Seal", url: "https://i.imgflip.com/1e7ql7.jpg", topText: "When you realize", bottomText: "Everyone heard that", category: "animal" },
  { id: "cat_lawyer", name: "Cat Lawyer", url: "https://i.imgflip.com/5c7lwq.jpg", topText: "Your honor", bottomText: "My client is innocent", category: "animal" },
  { id: "ducks", name: "Two Ducks", url: "https://i.imgflip.com/3si4.jpg", topText: "Me and my friend", bottomText: "Planning something stupid", category: "animal" },
  
  // TECH/PROGRAMMER MEMES
  { id: "stack_overflow", name: "Stack Overflow", url: "https://i.imgflip.com/1jwhww.jpg", topText: "Reading documentation", bottomText: "Copy from Stack Overflow", category: "tech" },
  { id: "works_on_my_machine", name: "Works On My Machine", url: "https://i.imgflip.com/gk5el.jpg", topText: "Code works perfectly", bottomText: "On my machine", category: "tech" },
  { id: "bug", name: "Found Bug", url: "https://i.imgflip.com/2wifvo.jpg", topText: "Fixed one bug", bottomText: "Created three more", category: "tech" },
  { id: "merge_conflict", name: "Merge Conflict", url: "https://i.imgflip.com/2hgfw.jpg", topText: "Git merge", bottomText: "*sweating intensifies*", category: "tech" },
  { id: "production", name: "Push to Production", url: "https://i.imgflip.com/2od.jpg", topText: "Pushed to production", bottomText: "On Friday at 5pm", category: "tech" },
  { id: "legacy_code", name: "Legacy Code", url: "https://i.imgflip.com/1e7ql7.jpg", topText: "Trying to understand", bottomText: "Code from 10 years ago", category: "tech" },
  { id: "ai", name: "AI Taking Over", url: "https://i.imgflip.com/26am.jpg", topText: "How did AI solve this?", bottomText: "AI did it", category: "tech" },
  { id: "password", name: "Password Reset", url: "https://i.imgflip.com/1bgw.jpg", topText: "Forgot password", bottomText: "Create new one. Can't be previous password.", category: "tech" },
  
  // SCHOOL/STUDENT MEMES
  { id: "homework", name: "Homework", url: "https://i.imgflip.com/2wifvo.jpg", topText: "Homework due tomorrow", bottomText: "Still haven't started", category: "school" },
  { id: "exam", name: "Exam Panic", url: "https://i.imgflip.com/3qqcim.jpg", topText: "Didn't study - PANIK", bottomText: "Exam is multiple choice - KALM", category: "school" },
  { id: "teacher", name: "Teacher Logic", url: "https://i.imgflip.com/1bij.jpg", topText: "Teacher: This will be useful", bottomText: "Narrator: It wasn't", category: "school" },
  { id: "group_project", name: "Group Project", url: "https://i.imgflip.com/gk5el.jpg", topText: "Group project", bottomText: "I did everything myself", category: "school" },
  { id: "summer", name: "Summer Break", url: "https://i.imgflip.com/14wx.jpg", topText: "Last day of school", bottomText: "FREEDOM!", category: "school" },
  
  // POLITICS/DEBATE
  { id: "change", name: "Change My Mind", url: "https://i.imgflip.com/24y43o.jpg", topText: "Pineapple belongs on pizza", bottomText: "Change my mind", category: "debate" },
  { id: "argument", name: "Online Argument", url: "https://i.imgflip.com/2fm6x.jpg", topText: "Winning online argument", bottomText: "With facts and logic", category: "debate" },
  { id: "opinion", name: "My Opinion", url: "https://i.imgflip.com/30b1gx.jpg", topText: "Wrong opinion", bottomText: "My correct opinion", category: "debate" },
  
  // BUSINESS/MONEY
  { id: "stonks", name: "Stonks", url: "https://i.imgflip.com/2hvti.jpg", topText: "Spent entire paycheck", bottomText: "On meme coins - Stonks", category: "business" },
  { id: "broke", name: "Broke", url: "https://i.imgflip.com/1e7ql7.jpg", topText: "Paycheck arrives", bottomText: "Bills: It's free real estate", category: "business" },
  { id: "invest", name: "Investment", url: "https://i.imgflip.com/1h7in3.jpg", topText: "Can't lose money", bottomText: "If you never invest", category: "business" },
  { id: "entrepreneur", name: "Entrepreneur", url: "https://i.imgflip.com/gfgc4.jpg", topText: "Start a business they said", bottomText: "It'll be fun they said", category: "business" },
  
  // MISCELLANEOUS
  { id: "spongebob", name: "Mocking SpongeBob", url: "https://i.imgflip.com/1otk96.jpg", topText: "YoU nEeD tO wAkE uP eArLy", bottomText: "ToMoRrOw", category: "sarcasm" },
  { id: "picard", name: "Picard Facepalm", url: "https://i.imgflip.com/1bij.jpg", topText: "When someone says 'just google it'", bottomText: "After you spent 3 hours googling", category: "sarcasm" },
  { id: "aliens", name: "Ancient Aliens", url: "https://i.imgflip.com/26am.jpg", topText: "How did this happen?", bottomText: "Aliens", category: "conspiracy" },
  { id: "leonardo", name: "Leo Cheers", url: "https://i.imgflip.com/14wx.jpg", topText: "When you accomplish", bottomText: "Absolutely nothing today", category: "celebration" },
  { id: "spiderman", name: "Spider-Man Pointing", url: "https://i.imgflip.com/2of9ds.jpg", topText: "Me accusing my friend", bottomText: "Of the same thing I do", category: "pointing" },
  { id: "buttons", name: "Two Buttons", url: "https://i.imgflip.com/1g8my4.jpg", topText: "Be productive", bottomText: "Watch one more episode", category: "decision" },
  { id: "evil", name: "Evil Kermit", url: "https://i.imgflip.com/1e7ql7.jpg", topText: "Me: Go to sleep", bottomText: "Evil me: Watch one more video", category: "internal" },
  { id: "trade_offer", name: "Trade Offer", url: "https://i.imgflip.com/54hjww.jpg", topText: "I receive: Your attention", bottomText: "You receive: Memes", category: "trade" },
  { id: "bonjour", name: "Bonjour Bear", url: "https://i.imgflip.com/4h0xz.jpg", topText: "Depression at 3am", bottomText: "Bonjour", category: "visit" },
  { id: "upgrades", name: "Upgrades People", url: "https://i.imgflip.com/2dq14m.jpg", topText: "Old version", bottomText: "Upgrades people, upgrades!", category: "upgrade" },
  { id: "buff_doge", name: "Buff Doge vs Cheems", url: "https://i.imgflip.com/43a45p.jpg", topText: "People back then: Strong", bottomText: "People now: Weak", category: "comparison" },
  { id: "always_has_been", name: "Always Has Been", url: "https://i.imgflip.com/3bawf1.jpg", topText: "Wait it's all memes?", bottomText: "Always has been", category: "reveal" },
  { id: "gru_plan", name: "Gru's Plan", url: "https://i.imgflip.com/26jxvz.jpg", topText: "Make a plan", bottomText: "Plan fails", category: "plan" },
  { id: "exit", name: "Exit 12", url: "https://i.imgflip.com/1wz3as.jpg", topText: "Easy solution", bottomText: "Taking the hard way", category: "choice" },
  { id: "domino", name: "Domino Effect", url: "https://i.imgflip.com/u0pf0.jpg", topText: "Small decision", bottomText: "Major consequences", category: "cause" },
  { id: "who_would_win", name: "Who Would Win", url: "https://i.imgflip.com/1oor.jpg", topText: "Entire army", bottomText: "One small thing", category: "battle" },
  { id: "winnie", name: "Fancy Pooh", url: "https://i.imgflip.com/2gnnjh.jpg", topText: "Regular way", bottomText: "Fancy way", category: "fancy" },
  { id: "brain_meme", name: "Big Brain", url: "https://i.imgflip.com/2e1fy7.jpg", topText: "Average solution", bottomText: "Big brain solution", category: "smart" },
  { id: "uno_reverse", name: "UNO Reverse", url: "https://i.imgflip.com/5cbizw.jpg", topText: "Them: Insults me", bottomText: "Me: No u", category: "reverse" },
  { id: "the_rock", name: "The Rock Driving", url: "https://i.imgflip.com/grr.jpg", topText: "Normal people", bottomText: "Me with weird thoughts", category: "weird" },
  { id: "coffin_dance", name: "Coffin Dance", url: "https://i.imgflip.com/3pxgez.jpg", topText: "When you fail", bottomText: "But make it entertaining", category: "fail" },
  { id: "math", name: "Quick Maths", url: "https://i.imgflip.com/3oevdk.jpg", topText: "2+2 = 4", bottomText: "Minus 1 that's 3", category: "math" },
  { id: "visible_confusion", name: "Visible Confusion", url: "https://i.imgflip.com/3oq7mu.jpg", topText: "When tutorial says easy", bottomText: "*visible confusion*", category: "confusion" },
  { id: "press_f", name: "Press F to Pay Respects", url: "https://i.imgflip.com/2fm6x.jpg", topText: "Something dies", bottomText: "Press F", category: "respect" },
  { id: "ight_imma", name: "Ight Imma Head Out", url: "https://i.imgflip.com/392xtu.jpg", topText: "Drama starts", bottomText: "Ight imma head out", category: "leave" },
  { id: "shut_up_money", name: "Shut Up and Take My Money", url: "https://i.imgflip.com/1iz92z.jpg", topText: "Product I don't need", bottomText: "Shut up and take my money", category: "money" },
  { id: "well_yes", name: "Well Yes But Actually No", url: "https://i.imgflip.com/30b1gx.jpg", topText: "That's correct", bottomText: "Well yes but actually no", category: "paradox" },
  { id: "sonic", name: "Sonic Says", url: "https://i.imgflip.com/3pnmg.jpg", topText: "Doing something wrong", bottomText: "That's no good!", category: "advice" },
  { id: "megamind", name: "No Megamind", url: "https://i.imgflip.com/3oq7mu.jpg", topText: "Having no ideas", bottomText: "No thoughts head empty", category: "empty" },
];

export default function MemeCreator() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedTemplate, setSelectedTemplate] = useState(memeTemplates[0]);
  const [customImage, setCustomImage] = useState(null);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [showTemplates, setShowTemplates] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    if (selectedTemplate) {
      setTopText(selectedTemplate.topText);
      setBottomText(selectedTemplate.bottomText);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (selectedTemplate || customImage) {
      drawMeme();
    }
  }, [topText, bottomText, fontSize, textColor, selectedTemplate?.id, customImage]);

  const drawMeme = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);
      
      ctx.fillStyle = textColor;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = fontSize / 20;
      ctx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      const drawText = (text, y) => {
        const maxWidth = canvas.width - 40;
        const words = text.toUpperCase().split(' ');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
          const testLine = currentLine + ' ' + words[i];
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth) {
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);

        lines.forEach((line, index) => {
          const yPos = y + (index * fontSize * 1.1);
          ctx.strokeText(line, canvas.width / 2, yPos);
          ctx.fillText(line, canvas.width / 2, yPos);
        });
      };

      if (topText) {
        drawText(topText, 20);
      }
      
      if (bottomText) {
        const bottomY = canvas.height - (fontSize * 1.5) - 20;
        drawText(bottomText, bottomY);
      }
      
      setImageLoaded(true);
    };

    img.src = customImage || selectedTemplate.url;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomImage(event.target.result);
        setShowTemplates(false);
        setImageLoaded(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = 'my-meme.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve));
      const file = new File([blob], 'meme.png', { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'My Meme',
          text: 'Check out this meme I created!'
        });
      } else {
        alert('Share feature not supported. Use download instead!');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const generateAIMeme = async () => {
    setIsGenerating(true);
    try {
      const memeContext = selectedTemplate?.name || "general meme";
      const memeCategory = selectedTemplate?.category || "classic";
      
      const prompt = `You are the funniest meme lord on the internet. Create HILARIOUS meme text for "${memeContext}" template (category: ${memeCategory}).

Context: ${memeCategory === 'reaction' ? 'Create a perfect reaction meme' : 
           memeCategory === 'decision' ? 'Show the struggle of choosing' :
           memeCategory === 'genius' ? 'Make it cleverly stupid' :
           memeCategory === 'sarcasm' ? 'Maximum mockery energy' :
           memeCategory === 'chaos' ? 'Embrace the chaos and destruction' :
           'Make it relatable and viral-worthy'}

Rules:
- Be EXTREMELY funny and clever
- Use current 2024-2025 trends, slang, and internet culture
- Reference modern struggles: AI, apps, social media, WFH, inflation, dating apps
- Short, punchy, meme-worthy text
- Think like a Gen Z comedian who lives on Twitter/TikTok
- Add unexpected twists that make people laugh out loud

Examples of good meme humor:
- "POV:" scenarios
- Overthinking everyday situations  
- Calling out relatable behavior
- Modern technology struggles
- Work from home chaos
- Dating app disasters
- Inflation jokes
- AI taking over everything

Return ONLY JSON with "topText" and "bottomText". Make it VIRAL! 🔥`;
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            topText: { type: "string" },
            bottomText: { type: "string" }
          }
        }
      });

      setTopText(result.topText);
      setBottomText(result.bottomText);
    } catch (err) {
      console.error('AI generation failed:', err);
      alert('Failed to generate AI meme. Try manual text!');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-pink-950 to-gray-950 pb-20">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(createPageUrl("Universe"))}
            className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Laugh className="w-8 h-8 text-pink-400 animate-bounce" />
              Meme Creator
            </h1>
            <p className="text-gray-400">🔥 Create viral memes in seconds 🔥</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              disabled={!imageLoaded}
              className="bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handleShare}
              disabled={!imageLoaded}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Canvas Area */}
          <div className="space-y-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="relative bg-black rounded-xl overflow-hidden">
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                      <RefreshCw className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto"
                    style={{ maxHeight: '600px' }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  setShowTemplates(true);
                  setCustomImage(null);
                }}
                variant="outline"
                className="bg-white/5 hover:bg-white/10"
              >
                <Grid3x3 className="w-4 h-4 mr-2" />
                Templates
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="bg-white/5 hover:bg-white/10"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={generateAIMeme}
                disabled={isGenerating}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    AI Magic
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  const randomTemplate = memeTemplates[Math.floor(Math.random() * memeTemplates.length)];
                  setSelectedTemplate(randomTemplate);
                  setCustomImage(null);
                  setImageLoaded(false);
                }}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Random
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Text Inputs */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Type className="w-5 h-5 text-pink-400" />
                  <h3 className="text-white font-bold text-lg">Meme Text</h3>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Top Text</label>
                  <Input
                    value={topText}
                    onChange={(e) => setTopText(e.target.value)}
                    placeholder="Enter top text..."
                    className="bg-white/10 border-white/20 text-white text-lg"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Bottom Text</label>
                  <Input
                    value={bottomText}
                    onChange={(e) => setBottomText(e.target.value)}
                    placeholder="Enter bottom text..."
                    className="bg-white/10 border-white/20 text-white text-lg"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => {
                      setTopText("");
                      setBottomText("");
                    }}
                    size="sm"
                    variant="outline"
                    className="bg-white/5 hover:bg-white/10"
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={() => {
                      const temp = topText;
                      setTopText(bottomText);
                      setBottomText(temp);
                    }}
                    size="sm"
                    variant="outline"
                    className="bg-white/5 hover:bg-white/10"
                  >
                    <Shuffle className="w-3 h-3 mr-1" />
                    Swap
                  </Button>
                  <Button
                    onClick={() => {
                      setTopText(topText.toUpperCase());
                      setBottomText(bottomText.toUpperCase());
                    }}
                    size="sm"
                    variant="outline"
                    className="bg-white/5 hover:bg-white/10"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    CAPS
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Style Controls */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Palette className="w-5 h-5 text-pink-400" />
                  <h3 className="text-white font-bold text-lg">Text Style</h3>
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">
                    Font Size: {fontSize}px
                  </label>
                  <Slider
                    value={[fontSize]}
                    onValueChange={(value) => setFontSize(value[0])}
                    min={24}
                    max={96}
                    step={4}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm mb-2 block">Text Color</label>
                  <div className="flex gap-3">
                    {['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setTextColor(color)}
                        className={`w-12 h-12 rounded-xl border-2 transition ${
                          textColor === color ? 'border-pink-400 scale-110' : 'border-white/20'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-12 h-12 rounded-xl cursor-pointer"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Templates Grid */}
            {showTemplates && (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-5 h-5 text-pink-400" />
                      <h3 className="text-white font-bold text-lg">Templates</h3>
                    </div>
                    <span className="text-gray-400 text-sm">
                      {selectedCategory === 'all' ? memeTemplates.length : memeTemplates.filter(t => t.category === selectedCategory).length} memes
                    </span>
                  </div>

                  {/* Category Filter */}
                  <div className="flex flex-wrap gap-2 mb-4 max-h-32 overflow-y-auto">
                    {['all', 'classic', 'reaction', 'smart', 'scary', 'motivational', 'wholesome', 'gaming', 'work', 'relationship', 'food', 'animal', 'tech', 'school', 'debate', 'business', 'chaos', 'sarcasm'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex-shrink-0 ${
                          selectedCategory === cat
                            ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {cat === 'all' ? '🔥 All' : 
                         cat === 'scary' ? '👻 Scary' :
                         cat === 'smart' ? '🧠 Smart' :
                         cat === 'motivational' ? '💪 Motivational' :
                         cat === 'wholesome' ? '💖 Wholesome' :
                         cat === 'gaming' ? '🎮 Gaming' :
                         cat === 'work' ? '💼 Work' :
                         cat === 'relationship' ? '❤️ Love' :
                         cat === 'food' ? '🍕 Food' :
                         cat === 'animal' ? '🐱 Animals' :
                         cat === 'tech' ? '💻 Tech' :
                         cat === 'school' ? '📚 School' :
                         cat === 'debate' ? '🤔 Debate' :
                         cat === 'business' ? '💰 Money' :
                         cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                    {memeTemplates
                      .filter(t => selectedCategory === 'all' || t.category === selectedCategory)
                      .map((template) => (
                        <motion.button
                          key={template.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setSelectedTemplate(template);
                            setCustomImage(null);
                            setImageLoaded(false);
                          }}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${
                            selectedTemplate.id === template.id && !customImage
                              ? 'border-pink-400 shadow-lg shadow-pink-400/50'
                              : 'border-white/20 hover:border-white/40'
                          }`}
                        >
                          <img
                            src={template.url}
                            alt={template.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                            <span className="text-white text-xs font-medium line-clamp-2">
                              {template.name}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Pro Tips */}
        <Card className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/30 mt-6">
          <CardContent className="p-6">
            <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-400 animate-pulse" />
              Pro Meme Tips 🚀
            </h3>
            <div className="grid md:grid-cols-4 gap-3 text-sm">
              <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition">
                <p className="text-pink-400 font-semibold mb-1">✨ AI Magic</p>
                <p className="text-gray-300">Let AI create hilarious, trending meme text for you!</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition">
                <p className="text-pink-400 font-semibold mb-1">🎯 Keep it Punchy</p>
                <p className="text-gray-300">Short text = Maximum impact. Less is more in memes!</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition">
                <p className="text-pink-400 font-semibold mb-1">🎲 Random Button</p>
                <p className="text-gray-300">Can't decide? Hit Random for instant inspiration!</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition">
                <p className="text-pink-400 font-semibold mb-1">📱 Go Viral</p>
                <p className="text-gray-300">Download & share everywhere - make the internet laugh!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}